import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { countryScrapeQueue } from '../lib/queue.js';

export const scrapeCountryRouter = Router();

const ScrapeBody = z.object({
  country: z.string().trim().min(1),
  website: z.string().trim().min(1),
  keyword: z.string().trim().min(1).max(80),
});

function hostFromWebsite(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return website.replace(/^www\./, '');
  }
}

/**
 * Manual scrape of one country website.
 * Now queue-centric: creates a SourceRun + enqueues to the country-scrape worker.
 */
scrapeCountryRouter.post('/', async (req: Request, res: Response) => {
  const parsed = ScrapeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'country, website, and keyword are required' });
    return;
  }

  const { country, website, keyword } = parsed.data;
  const sourceName = hostFromWebsite(website);

  try {
    // Lazy-create the source so ad-hoc scrapes work without a full sync.
    const source = await prisma.source.upsert({
      where: { name: sourceName },
      update: {},
      create: {
        name: sourceName,
        type: 'SCRAPER',
        country,
        website,
        enabled: true,
      },
    });

    const keywordRow = await prisma.keyword.upsert({
      where: { term: keyword },
      update: {},
      create: { term: keyword, category: 'ad-hoc', enabled: true, scheduleHours: 6 },
    });

    const run = await prisma.sourceRun.create({
      data: {
        sourceId: source.id,
        keywordId: keywordRow.id,
        runType: 'manual',
        status: 'QUEUED',
      },
    });

    await countryScrapeQueue.add('scrape', { runId: run.id }, { jobId: `scrape-${run.id}` });

    logger.info({ runId: run.id, country, website, keyword }, 'Country scrape queued');

    res.json({
      status: 'queued',
      message: `Scraping "${keyword}" from ${website} (${country}). Results will appear shortly.`,
      country,
      website,
      keyword,
      runId: run.id,
    });
  } catch (err) {
    logger.error({ err, country, website }, 'Failed to queue country scrape');
    res.status(500).json({ error: 'Failed to queue country scrape' });
  }
});

/**
 * Legacy status endpoint — resolves the most recent run for a source
 * (used by the existing Jobs page polling until it moves to /api/runs/:id).
 */
scrapeCountryRouter.get('/status', async (req: Request, res: Response) => {
  const { website } = req.query as { website?: string };
  if (!website) {
    res.json({ phase: 'idle' });
    return;
  }

  const sourceName = hostFromWebsite(website);
  const source = await prisma.source.findUnique({ where: { name: sourceName } });
  if (!source) {
    res.json({ phase: 'idle' });
    return;
  }

  const recent = await prisma.sourceRun.findFirst({
    where: {
      sourceId: source.id,
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!recent) {
    res.json({ phase: 'idle' });
    return;
  }

  const phase =
    recent.status === 'QUEUED' || recent.status === 'RUNNING' ? 'scraping'
    : recent.status === 'SUCCESS' ? 'done'
    : 'error';

  res.json({
    phase,
    message:
      phase === 'error'
        ? recent.error || 'Scrape failed'
        : phase === 'done'
          ? `Complete! ${recent.itemsNew} new jobs, ${recent.itemsDup} duplicates.`
          : `Scraping… found ${recent.itemsFetched} so far.`,
    itemsFound: recent.itemsFetched,
    itemsProcessed: recent.itemsNew,
    runId: recent.id,
  });
});
