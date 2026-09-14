import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { sourceFetchQueue, countryScrapeQueue } from '../lib/queue.js';
import { SCRAPER_SITES, LINKEDIN_SOURCE } from '../data/scraper-sites.js';
import type { Keyword, Source } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Source seeding
// ─────────────────────────────────────────────────────────────────────────────

/** Ensure the LinkedIn + all known website sources exist in the DB (idempotent). */
export async function ensureSources(): Promise<number> {
  let count = 0;

  await prisma.source.upsert({
    where: { name: LINKEDIN_SOURCE.name },
    update: { type: 'APIFY', enabled: true },
    create: {
      name: LINKEDIN_SOURCE.name,
      type: 'APIFY',
      country: null,
      website: null,
      enabled: true,
    },
  });
  count++;

  for (const site of SCRAPER_SITES) {
    await prisma.source.upsert({
      where: { name: site.name },
      update: {}, // Never clobber user toggles on re-run
      create: {
        name: site.name,
        type: 'SCRAPER',
        country: site.country,
        website: site.website,
        enabled: site.enabled,
      },
    });
    count++;
  }

  logger.info({ count }, 'Sources ensured');
  return count;
}

/** Resolve a Source by its name or website domain, creating it lazily when needed. */
export async function findOrCreateSource(input: {
  name: string;
  type?: 'APIFY' | 'SCRAPER';
  country?: string | null;
  website?: string | null;
}): Promise<Source> {
  return prisma.source.upsert({
    where: { name: input.name },
    update: {},
    create: {
      name: input.name,
      type: input.type ?? 'SCRAPER',
      country: input.country ?? null,
      website: input.website ?? null,
      enabled: true,
    },
  });
}

/** Resolve a Keyword by term (case-insensitive), creating it lazily when needed. */
export async function findOrCreateKeyword(
  term: string,
  extra?: { location?: string | null; category?: string },
): Promise<Keyword> {
  const existing = await prisma.keyword.findFirst({
    where: { term: { equals: term, mode: 'insensitive' } },
  });
  if (existing) {
    if (extra?.location && !existing.location) {
      return prisma.keyword.update({ where: { id: existing.id }, data: { location: extra.location } });
    }
    return existing;
  }
  try {
    return await prisma.keyword.create({
      data: {
        term,
        category: extra?.category ?? 'tech',
        location: extra?.location ?? null,
        enabled: true,
        scheduleHours: 6,
      },
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      const fallback = await prisma.keyword.findFirst({
        where: { term: { equals: term, mode: 'insensitive' } },
      });
      if (fallback) return fallback;
    }
    throw err;
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// Run creation & enqueueing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a SourceRun for a keyword×source pair and enqueue it.
 * Skips if an identical run is still QUEUED/RUNNING (idempotency).
 */
export async function createRunForPair(
  keyword: Keyword,
  source: Source,
  runType: 'scheduled' | 'manual',
): Promise<{ runId: string } | null> {
  const active = await prisma.sourceRun.findFirst({
    where: {
      sourceId: source.id,
      keywordId: keyword.id,
      status: { in: ['QUEUED', 'RUNNING'] },
    },
  });

  if (active) {
    logger.debug({ source: source.name, keyword: keyword.term, run: active.id }, 'Run already active, skipping');
    return { runId: active.id };
  }

  const run = await prisma.sourceRun.create({
    data: { sourceId: source.id, keywordId: keyword.id, runType, status: 'QUEUED' },
  });

  if (source.type === 'APIFY') {
    await sourceFetchQueue.add('fetch', { runId: run.id }, { jobId: `fetch-${run.id}` });
  } else if (source.website) {
    await countryScrapeQueue.add('scrape', { runId: run.id }, { jobId: `scrape-${run.id}` });
  } else {
    await prisma.sourceRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', finishedAt: new Date(), error: 'Source has no website configured' },
    });
    return null;
  }

  return { runId: run.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling
// ─────────────────────────────────────────────────────────────────────────────

function isDue(keyword: Keyword, source: Source): Promise<boolean> {
  return prisma.sourceRun
    .findFirst({
      where: {
        sourceId: source.id,
        keywordId: keyword.id,
        status: { in: ['SUCCESS', 'FAILED'] },
      },
      orderBy: { finishedAt: 'desc' },
    })
    .then((last) => {
      if (!last?.finishedAt) return true; // never ran → start soon
      return Date.now() - last.finishedAt.getTime() >= keyword.scheduleHours * 3600_000;
    });
}

/** Enqueue scheduled runs for every enabled keyword × enabled source that is due. */
export async function enqueueDueRuns(): Promise<number> {
  const keywords = await prisma.keyword.findMany({ where: { enabled: true } });
  const sources = await prisma.source.findMany({ where: { enabled: true } });

  let created = 0;
  for (const keyword of keywords) {
    for (const source of sources) {
      try {
        if (await isDue(keyword, source)) {
          const run = await createRunForPair(keyword, source, 'scheduled');
          if (run) created++;
        }
      } catch (err) {
        logger.error({ err, keyword: keyword.term, source: source.name }, 'Scheduler: failed to enqueue run');
      }
    }
  }

  if (created > 0) {
    logger.info({ created, keywords: keywords.length, sources: sources.length }, 'Scheduler: runs enqueued');
  }
  return created;
}

/** Manual "run now" — skip the due window entirely. Optionally scope to one keyword. */
export async function triggerManualRuns(keywordId?: string): Promise<number> {
  const keywords = keywordId
    ? await prisma.keyword.findMany({ where: { id: keywordId, enabled: true } })
    : await prisma.keyword.findMany({ where: { enabled: true } });
  const sources = await prisma.source.findMany({ where: { enabled: true } });

  let created = 0;
  for (const keyword of keywords) {
    for (const source of sources) {
      const run = await createRunForPair(keyword, source, 'manual');
      if (run) created++;
    }
  }
  logger.info({ created }, 'Manual run trigger complete');
  return created;
}

/** Re-enqueue a failed/completed run. */
export async function retryRun(sourceRunId: string): Promise<void> {
  const run = await prisma.sourceRun.findUnique({
    where: { id: sourceRunId },
    include: { source: true },
  });
  if (!run) throw new Error('Run not found');

  await prisma.sourceRun.update({
    where: { id: run.id },
    data: { status: 'QUEUED', error: null, itemsFetched: 0, itemsNew: 0, itemsDup: 0, itemsFiltered: 0, itemsFailed: 0 },
  });

  if (run.source.type === 'APIFY') {
    await sourceFetchQueue.add('fetch', { runId: run.id }, { jobId: `fetch-${run.id}` });
  } else {
    await countryScrapeQueue.add('scrape', { runId: run.id }, { jobId: `scrape-${run.id}` });
  }
}