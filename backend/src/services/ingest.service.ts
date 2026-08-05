import { prisma } from '../lib/prisma.js';
import { aiQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import {
  triggerApifyRun,
  waitForApifyRun,
  fetchApifyDataset,
} from './apify.service.js';
import { filterJob, mapApifyItemToRaw } from './filter.service.js';

export async function ingestJobs(keyword: string, location: string): Promise<void> {
  logger.info({ keyword, location }, 'Starting job ingestion pipeline');

  // Step 1: Trigger Apify actor run
  const { runId } = await triggerApifyRun(keyword, location);

  // Step 2: Wait for the run to complete (polls every 5s, max 5 min)
  const datasetId = await waitForApifyRun(runId);

  // Step 3: Fetch results from the dataset
  const items = await fetchApifyDataset(datasetId);

  if (items.length === 0) {
    logger.warn({ keyword, location }, 'Apify returned 0 items');
    return;
  }

  let rawInserted = 0;
  let cleanInserted = 0;
  let filtered = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      const rawData = mapApifyItemToRaw(item, keyword, location);

      // Step 4: Upsert raw job (deduplicate by jobId + country)
      const rawJob = await prisma.rawJob.upsert({
        where: { jobId_country: { jobId: rawData.jobId, country: rawData.country } },
        create: rawData,
        update: {}, // No-op if already exists
      });

      rawInserted++;

      // Step 5: Check if clean_job already exists (skip if so)
      const existingClean = await prisma.cleanJob.findUnique({
        where: { rawJobId: rawJob.id },
      });

      if (existingClean) {
        skipped++;
        continue;
      }

      // Step 6: Apply rule-based filter
      const { relevant, domain } = filterJob({
        jobTitle: rawData.jobTitle,
        description: rawData.jobDescription,
      });

      if (!relevant) {
        filtered++;
        continue;
      }

      // Step 7: Insert into clean_jobs with PENDING status
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
      logger.error({ err, item }, 'Failed to process Apify item');
    }
  }

  logger.info(
    { total: items.length, rawInserted, cleanInserted, filtered, skipped },
    'Ingestion pipeline complete',
  );

  // Step 8: Trigger AI classification if new jobs were added
  if (cleanInserted > 0) {
    await aiQueue.add('process-batch', {
      triggeredBy: 'ingestion',
      keyword,
      location,
      newJobs: cleanInserted,
    });
    logger.info({ cleanInserted }, 'AI classification batch queued');
  }
}
