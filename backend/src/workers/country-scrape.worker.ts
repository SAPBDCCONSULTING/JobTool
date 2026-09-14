import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { runCountryScrape } from '../services/country-scrape.service.js';

export function createCountryScrapeWorker() {
  const worker = new Worker(
    'country-scrape',
    async (job) => {
      const { runId } = job.data as { runId: string };
      logger.info({ jobId: job.id, runId }, 'Country-scrape worker: processing job');
      await runCountryScrape(runId);
      logger.info({ jobId: job.id, runId }, 'Country-scrape worker: job complete');
    },
    {
      connection: redisConnection,
      concurrency: env.COUNTRY_SCRAPE_CONCURRENCY, // each job spawns a Playwright browser
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Country-scrape job failed');
  });
  worker.on('error', (err) => {
    logger.error({ err }, 'Country-scrape worker error');
  });

  return worker;
}