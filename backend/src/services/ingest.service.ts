import { prisma } from '../lib/prisma.js';
import { aiQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import {
  triggerApifyRun,
  waitForApifyRun,
  fetchApifyDataset,
  type ApifyJobItem,
} from './apify.service.js';
import { mapApifyItemToRaw, qualifyJob, type QualificationMode } from './filter.service.js';
import { jobHash, cleanJobTitle } from './normalize.js';
import { resolveCompany } from './company.service.js';
import { getSourceBaseMap, normalizeJobUrl } from './url.service.js';

export interface ProcessRawItemsResult {
  rawNew: number;
  rawExisting: number;
  canonicalNew: number;
  canonicalMatched: number;
  filtered: number;
  failed: number;
}

export interface ProcessRawOptions {
  /** Source name (e.g. "linkedin-apify", "reed.co.uk") — provenance on every raw record. */
  source: string;
  sourceRunId?: string;
  keyword?: string; // keyword term
  keywordId?: string;
  country: string;
  filterMode?: QualificationMode;
}

/**
 * Core pipeline shared by every source (LinkedIn/Apify, European site scrapers):
 *
 *   RawJobRecord (always stored)
 *     → company resolution
 *     → canonical dedup (job hash within 90d)
 *     → linked duplicate? refresh lastSeen | new? create canonical (CleanJob, PENDING)
 *
 * Only canonical jobs proceed to AI — never re-run on re-observed unchanged jobs.
 */
export async function processRawItems(
  items: ApifyJobItem[],
  opts: ProcessRawOptions,
): Promise<ProcessRawItemsResult> {
  const { source, sourceRunId, keyword = '', keywordId, country, filterMode = 'strict' } = opts;

  // Timestamp used to distinguish raw records created by this run (isNew).
  const runStartTime = Date.now() - 1000;

  const result: ProcessRawItemsResult = {
    rawNew: 0,
    rawExisting: 0,
    canonicalNew: 0,
    canonicalMatched: 0,
    filtered: 0,
    failed: 0,
  };

  // Source website origins for resolving relative job URLs (cached).
  const sourceBases = await getSourceBaseMap();

  for (const item of items) {
    try {
      const rawData = mapApifyItemToRaw(item, keyword, country);
      // Make relative job links absolute against the source site origin.
      rawData.url = normalizeJobUrl(rawData.url, source, sourceBases);

      const company = await resolveCompany(rawData.companyName, country);

      // ── Step 1: ensure the raw record (source identity = jobId + country) ──
      let raw = await prisma.rawJob.findUnique({
        where: { jobId_country: { jobId: rawData.jobId, country: rawData.country } },
      });

      if (!raw) {
        raw = await prisma.rawJob.create({
          data: {
            ...rawData,
            source,
            companyName: rawData.companyName,
            keywordId: keywordId ?? null,
            sourceRunId: sourceRunId ?? null,
          },
        });
        result.rawNew++;
      } else {
        result.rawExisting++;
        // Attach provenance to legacy rows (pre-Phase-1 records).
        if (rawData.url && !raw.url) {
          raw = await prisma.rawJob.update({ where: { id: raw.id }, data: { url: rawData.url } });
        }
      }

      // Clean the title (date prefixes, "- Company" suffixes) BEFORE hashing so
      // dedup keys are stable regardless of scraping noise.
      const cleanTitle = cleanJobTitle(raw.jobTitle, raw.companyName);
      const hash = jobHash(company.normalizedName, cleanTitle, raw.location ?? '');

      // ── Step 2: ensure the canonical job for this raw record ──
      await ensureCanonical(raw.id, {
        companyId: company.id,
        companyName: raw.companyName,
        cleanTitle,
        hash,
        keyword,
        filterMode,
        isNew: raw.createdAt.getTime() >= runStartTime,
        result,
      });
    } catch (err) {
      result.failed++;
      logger.error({ err, item }, 'Failed to process raw item');
    }
  }

  logger.info(
    { total: items.length, ...result, source, keyword, country },
    'Ingestion pipeline complete',
  );

  // ── Step 3: trigger AI classification for newly created canonical jobs ──
  if (result.canonicalNew > 0) {
    await aiQueue.add(
      'process-batch',
      {
        triggeredBy: 'ingestion',
        keyword,
        location: country,
        newJobs: result.canonicalNew,
      },
      { jobId: `ai-batch-${sourceRunId ?? 'manual'}-${Date.now()}` },
    );
    logger.info({ canonicalNew: result.canonicalNew }, 'AI classification batch queued');
  }

  return result;
async function ensureCanonical(
  rawId: string,
  ctx: {
    companyId: string;
    companyName: string;
    cleanTitle: string;
    hash: string;
    keyword: string;
    filterMode: QualificationMode;
    isNew: boolean;
    result: ProcessRawItemsResult;
  },
): Promise<void> {
  const raw = await prisma.rawJob.findUnique({ where: { id: rawId } });
  if (!raw) return;

  // Already linked — refresh the canonical job's liveness, never re-run AI (Rule 6).
  if (raw.canonicalJobId) {
    await prisma.cleanJob.update({
      where: { id: raw.canonicalJobId },
      data: { lastSeenAt: new Date(), lifecycleStatus: 'ACTIVE' },
    });
    return;
  }

  // Legacy records that already originated a clean job (pre-Phase-1).
  const existingOrigin = await prisma.cleanJob.findUnique({ where: { rawJobId: raw.id } });
  if (existingOrigin) {
    await prisma.rawJob.update({ where: { id: raw.id }, data: { canonicalJobId: existingOrigin.id } });
    await prisma.cleanJob.update({
      where: { id: existingOrigin.id },
      data: { lastSeenAt: new Date(), lifecycleStatus: 'ACTIVE', companyId: ctx.companyId },
    });
    return;
  }

  // ── Deterministic qualification gate — rejected jobs never reach AI ──
  const { qualified, domain } = qualifyJob(
    { jobTitle: raw.jobTitle, description: raw.jobDescription },
    ctx.keyword,
    ctx.filterMode,
  );
  if (!qualified) {
    ctx.result.filtered++;
    return;
  }

  // ── Cross-source duplicate detection (candidate-first, indexed by jobHash) ──
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const match =
    (await prisma.cleanJob.findFirst({
      where: {
        jobHash: ctx.hash,
        lifecycleStatus: 'ACTIVE',
        lastSeenAt: { gte: cutoff },
      },
      orderBy: { lastSeenAt: 'desc' },
    })) ??
    // Fallback: same company + same cleaned title (catches legacy rows hashed
    // from un-cleaned titles, and same-company cross-location re-postings).
    (await prisma.cleanJob.findFirst({
      where: {
        companyId: ctx.companyId,
        jobTitle: { equals: ctx.cleanTitle, mode: 'insensitive' },
        lifecycleStatus: 'ACTIVE',
        lastSeenAt: { gte: cutoff },
      },
      orderBy: { lastSeenAt: 'desc' },
    }));

  if (match) {
    await prisma.rawJob.update({ where: { id: raw.id }, data: { canonicalJobId: match.id } });
    await prisma.cleanJob.update({
      where: { id: match.id },
      data: {
        lastSeenAt: new Date(),
        lifecycleStatus: 'ACTIVE',
        // Adopt the cleaned title on legacy rows.
        ...(match.jobTitle !== ctx.cleanTitle ? { jobTitle: ctx.cleanTitle, jobHash: ctx.hash } : {}),
      },
    });
    if (ctx.isNew) ctx.result.canonicalMatched++;
    return;
  }

  // ── No match → new canonical job, queued for AI ──
  const canonical = await prisma.cleanJob.create({
    data: {
      rawJobId: raw.id,
      jobTitle: ctx.cleanTitle || raw.jobTitle,
      jobDescription: raw.jobDescription,
      companyName: ctx.companyName,
      companyId: ctx.companyId,
      country: raw.country,
      domain,
      jobHash: ctx.hash,
      url: raw.url,
      lifecycleStatus: 'ACTIVE',
      lastSeenAt: new Date(),
      searchString: raw.searchString,
      aiStatus: 'PENDING',
    },
  });
  await prisma.rawJob.update({ where: { id: raw.id }, data: { canonicalJobId: canonical.id } });
  ctx.result.canonicalNew++;
}
}
// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn (Apify) source — fetch + process one SourceRun
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAndProcessApify(sourceRunId: string): Promise<void> {
  const run = await prisma.sourceRun.findUnique({
    where: { id: sourceRunId },
    include: { keyword: true, source: true },
  });
  if (!run || !run.keyword) {
    throw new Error(`SourceRun ${sourceRunId} not found or missing keyword`);
  }

  await prisma.sourceRun.update({
    where: { id: run.id },
    data: { status: 'RUNNING', startedAt: new Date(), error: null },
  });

  const location = run.keyword.location ?? '';

  try {
    logger.info(
      { runId: run.id, keyword: run.keyword.term, location },
      'Starting LinkedIn (Apify) fetch',
    );

    const { runId, datasetId } = await triggerApifyRun(run.keyword.term, location);
    const datasetIdResolved = await waitForApifyRun(runId);
    const items = await fetchApifyDataset(datasetIdResolved);

    const result = await processRawItems(items, {
      source: run.source.name,
      sourceRunId: run.id,
      keyword: run.keyword.term,
      keywordId: run.keyword.id,
      country: location || 'Unknown',
      filterMode: 'strict',
    });

    await prisma.sourceRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        finishedAt: new Date(),
        itemsFetched: items.length,
        itemsNew: result.canonicalNew,
        itemsDup: result.rawExisting + result.canonicalMatched,
        itemsFiltered: result.filtered,
        itemsFailed: result.failed,
      },
    });
    logger.info({ runId: run.id, ...result }, 'LinkedIn (Apify) run complete');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, runId: run.id }, 'LinkedIn (Apify) run failed');
    await prisma.sourceRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', finishedAt: new Date(), error: message },
    });
    throw err;
  }
}