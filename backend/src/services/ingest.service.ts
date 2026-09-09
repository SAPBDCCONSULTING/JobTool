import { prisma } from '../lib/prisma.js';
import { aiQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import {
  triggerApifyRun,
  waitForApifyRun,
  fetchApifyDataset,
  type ApifyJobItem,
} from './apify.service.js';
import { filterJob, mapApifyItemToRaw } from './filter.service.js';

/**
 * Shared logic: process raw items into raw_jobs + clean_jobs + AI queue.
 * Used by both Apify ingestion and Python country scrapers.
 *
 * Dedup:
 * 1. raw_jobs upsert on (jobId, country) — same listing again is skipped for clean insert
 * 2. soft dedup on (companyName, jobTitle, country) — same role from different sources/ids
 */
export async function processRawItems(
  items: ApifyJobItem[],
  keyword: string,
  country: string,
  options?: { skipFilter?: boolean },
): Promise<{ rawInserted: number; cleanInserted: number; filtered: number; skipped: number }> {
  let rawInserted = 0;
  let cleanInserted = 0;
  let filtered = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      const rawData = mapApifyItemToRaw(item, keyword, country);

      const existingRaw = await prisma.rawJob.findUnique({
        where: { jobId_country: { jobId: rawData.jobId, country: rawData.country } },
      });

      const rawJob = await prisma.rawJob.upsert({
        where: { jobId_country: { jobId: rawData.jobId, country: rawData.country } },
        create: rawData,
        update: {},
      });

      if (!existingRaw) {
        rawInserted++;
      }

      const existingClean = await prisma.cleanJob.findUnique({
        where: { rawJobId: rawJob.id },
      });

      if (existingClean) {
        skipped++;
        continue;
      }

      // Soft dedup: same company + title + country already in clean_jobs (e.g. different jobId/source)
      const duplicateListing = await prisma.cleanJob.findFirst({
        where: {
          country: rawData.country,
          companyName: { equals: rawData.companyName, mode: 'insensitive' },
          jobTitle: { equals: rawData.jobTitle, mode: 'insensitive' },
        },
        select: { id: true },
      });

      if (duplicateListing) {
        skipped++;
        logger.debug(
          {
            company: rawData.companyName,
            title: rawData.jobTitle,
            country: rawData.country,
          },
          'Skipping duplicate listing (company+title+country)',
        );
        continue;
      }

      const { relevant, domain } = filterJob({
        jobTitle: rawData.jobTitle,
        description: rawData.jobDescription,
      });

      if (!relevant && !options?.skipFilter) {
        filtered++;
        continue;
      }

      await prisma.cleanJob.create({
        data: {
          rawJobId: rawJob.id,
          jobTitle: rawData.jobTitle,
          jobDescription: rawData.jobDescription,
          companyName: rawData.companyName,
          country: rawData.country,
          domain,
          searchString: keyword,
          aiStatus: 'PENDING',
        },
      });

      cleanInserted++;
    } catch (err) {
      logger.error({ err, item }, 'Failed to process item');
    }
  }

  logger.info(
    { total: items.length, rawInserted, cleanInserted, filtered, skipped },
    'Ingestion pipeline complete',
  );

  if (cleanInserted > 0) {
    await aiQueue.add('process-batch', {
      triggeredBy: 'ingestion',
      keyword,
      location: country,
      newJobs: cleanInserted,
    });
    logger.info({ cleanInserted }, 'AI classification batch queued');
  }

  return { rawInserted, cleanInserted, filtered, skipped };
}

export async function ingestJobs(keyword: string, location: string): Promise<void> {
  logger.info({ keyword, location }, 'Starting job ingestion pipeline');

  const { runId } = await triggerApifyRun(keyword, location);
  const datasetId = await waitForApifyRun(runId);
  const items = await fetchApifyDataset(datasetId);

  if (items.length === 0) {
    logger.warn({ keyword, location }, 'Apify returned 0 items');
    return;
  }

  await processRawItems(items, keyword, location);
}
