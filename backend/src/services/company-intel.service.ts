import { prisma } from '../lib/prisma.js';
import { companyAiQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

const CONFIDENCE_DRIFT = 0.05;

function refreshWindowMs() {
  return env.COMPANY_INTEL_REFRESH_DAYS * 24 * 60 * 60 * 1000;
}

interface CompanyJobStats {
  jobCount: number;
  avgConfidence: number | null;
  newestJobAiAt: Date | null;
}

async function getCompanyJobStats(
  companyName: string,
  country: string,
): Promise<CompanyJobStats> {
  const agg = await prisma.cleanJob.aggregate({
    where: {
      companyName,
      country,
      aiStatus: 'DONE',
    },
    _count: { id: true },
    _avg: { confidence: true },
    _max: { aiProcessedAt: true },
  });

  return {
    jobCount: agg._count.id,
    avgConfidence: agg._avg.confidence,
    newestJobAiAt: agg._max.aiProcessedAt,
  };
}

/**
 * Decide whether company intelligence should be (re)queued.
 *
 * Rules:
 * - Never analyzed / FAILED / already PENDING → yes
 * - DONE + younger than COMPANY_INTEL_REFRESH_DAYS → no (keep score)
 * - DONE + older than window AND (new jobs OR relevance drift) → yes
 */
export async function shouldRefreshCompanyIntelligence(
  companyName: string,
  country: string,
): Promise<{ refresh: boolean; reason: string }> {
  const existing = await prisma.companyIntelligence.findUnique({
    where: { companyName_country: { companyName, country } },
  });

  if (!existing) {
    return { refresh: true, reason: 'missing' };
  }

  if (existing.aiStatus === 'PENDING' || existing.aiStatus === 'PROCESSING') {
    return { refresh: false, reason: 'already-queued' };
  }

  if (existing.aiStatus === 'FAILED') {
    return { refresh: true, reason: 'failed' };
  }

  // DONE
  const analyzedAt = existing.aiProcessedAt?.getTime() ?? 0;
  const ageMs = Date.now() - analyzedAt;
  if (ageMs < refreshWindowMs()) {
    return { refresh: false, reason: 'within-refresh-window' };
  }

  const stats = await getCompanyJobStats(companyName, country);
  const hasNewJobs =
    stats.jobCount !== existing.jobCountAtAnalysis ||
    (stats.newestJobAiAt != null &&
      existing.aiProcessedAt != null &&
      stats.newestJobAiAt.getTime() > existing.aiProcessedAt.getTime());

  const relevanceChanged =
    stats.avgConfidence != null &&
    existing.avgJobConfidence != null &&
    Math.abs(stats.avgConfidence - existing.avgJobConfidence) >= CONFIDENCE_DRIFT;

  if (hasNewJobs || relevanceChanged || stats.jobCount === 0) {
    return {
      refresh: true,
      reason: hasNewJobs ? 'stale-new-jobs' : 'stale-relevance',
    };
  }

  // Stale but no material change — skip to save OpenAI cost
  return { refresh: false, reason: 'stale-no-change' };
}

/**
 * Mark companies as needing (re)analysis after their jobs were classified,
 * gated by the 3-day refresh window + new jobs / relevance changes.
 */
export async function enqueueCompanyIntelligence(
  companies: Array<{ companyName: string; country: string }>,
): Promise<void> {
  const unique = new Map<string, { companyName: string; country: string }>();
  for (const c of companies) {
    const name = c.companyName?.trim();
    const country = c.country?.trim();
    if (!name || !country) continue;
    unique.set(`${name}::${country}`, { companyName: name, country });
  }

  if (unique.size === 0) return;

  let queued = 0;
  let skipped = 0;

  for (const c of unique.values()) {
    const { refresh, reason } = await shouldRefreshCompanyIntelligence(
      c.companyName,
      c.country,
    );

    if (!refresh) {
      skipped++;
      logger.debug(
        { company: c.companyName, country: c.country, reason },
        'Skipping company intelligence refresh',
      );
      continue;
    }

    await prisma.companyIntelligence.upsert({
      where: {
        companyName_country: { companyName: c.companyName, country: c.country },
      },
      create: {
        companyName: c.companyName,
        country: c.country,
        aiStatus: 'PENDING',
      },
      update: {
        aiStatus: 'PENDING',
        opportunityScore: null,
        whyNow: null,
        whatToSell: null,
        signals: null,
        aiProcessedAt: null,
      },
    });
    queued++;
  }

  if (queued === 0) {
    logger.info(
      { candidates: unique.size, skipped },
      'No company intelligence refreshes needed',
    );
    return;
  }

  await companyAiQueue.add('analyze-batch', {
    triggeredBy: 'job-classify',
    count: queued,
  });

  logger.info(
    { queued, skipped, candidates: unique.size, refreshDays: env.COMPANY_INTEL_REFRESH_DAYS },
    'Company intelligence batch queued',
  );
}

/**
 * Daily catch-up: re-queue DONE companies past the refresh window
 * that gained new jobs or relevance drift since last analysis.
 */
export async function enqueueStaleCompanyIntelligence(): Promise<number> {
  const cutoff = new Date(Date.now() - refreshWindowMs());

  const stale = await prisma.$queryRaw<
    Array<{ companyName: string; country: string }>
  >`
    SELECT ci."companyName", ci.country
    FROM company_intelligence ci
    WHERE ci."aiStatus" = 'DONE'::"AiStatus"
      AND (
        ci."aiProcessedAt" IS NULL
        OR ci."aiProcessedAt" < ${cutoff}
      )
      AND EXISTS (
        SELECT 1 FROM clean_jobs cj
        WHERE cj."companyName" = ci."companyName"
          AND cj.country = ci.country
          AND cj."aiStatus" = 'DONE'::"AiStatus"
          AND (
            (SELECT COUNT(*)::int FROM clean_jobs cj2
              WHERE cj2."companyName" = ci."companyName"
                AND cj2.country = ci.country
                AND cj2."aiStatus" = 'DONE'::"AiStatus"
            ) <> ci."jobCountAtAnalysis"
            OR cj."aiProcessedAt" > ci."aiProcessedAt"
            OR (
              ci."avgJobConfidence" IS NOT NULL
              AND ABS(
                COALESCE(
                  (SELECT AVG(cj3.confidence) FROM clean_jobs cj3
                    WHERE cj3."companyName" = ci."companyName"
                      AND cj3.country = ci.country
                      AND cj3."aiStatus" = 'DONE'::"AiStatus"
                      AND cj3.confidence IS NOT NULL),
                  ci."avgJobConfidence"
                ) - ci."avgJobConfidence"
              ) >= ${CONFIDENCE_DRIFT}
            )
          )
      )
    LIMIT 200
  `;

  // Also companies with DONE jobs but no intel row
  const missing = await prisma.$queryRaw<
    Array<{ companyName: string; country: string }>
  >`
    SELECT DISTINCT cj."companyName", cj.country
    FROM clean_jobs cj
    WHERE cj."aiStatus" = 'DONE'::"AiStatus"
      AND NOT EXISTS (
        SELECT 1 FROM company_intelligence ci
        WHERE ci."companyName" = cj."companyName"
          AND ci.country = cj.country
      )
    LIMIT 100
  `;

  const targets = [...stale, ...missing];
  if (targets.length === 0) {
    logger.info('No stale company intelligence to refresh');
    return 0;
  }

  await enqueueCompanyIntelligence(targets);
  logger.info(
    { stale: stale.length, missing: missing.length },
    'Stale company intelligence scan complete',
  );
  return targets.length;
}

/** Queue any companies still PENDING (manual refresh / catch-up). */
export async function enqueuePendingCompanyIntelligence(): Promise<number> {
  const pending = await prisma.companyIntelligence.count({
    where: { aiStatus: 'PENDING' },
  });

  const missing = await prisma.$queryRaw<Array<{ companyName: string; country: string }>>`
    SELECT DISTINCT cj."companyName", cj.country
    FROM clean_jobs cj
    WHERE cj."aiStatus" = 'DONE'::"AiStatus"
      AND NOT EXISTS (
        SELECT 1 FROM company_intelligence ci
        WHERE ci."companyName" = cj."companyName"
          AND ci.country = cj.country
      )
    LIMIT 100
  `;

  if (missing.length > 0) {
    await enqueueCompanyIntelligence(missing);
  } else if (pending > 0) {
    await companyAiQueue.add('analyze-batch', {
      triggeredBy: 'manual-refresh',
      count: pending,
    });
  }

  return pending + missing.length;
}
