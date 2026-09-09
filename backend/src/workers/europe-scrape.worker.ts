import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { runEuropeScrape } from '../services/europe-scrape.service.js';

export interface EuropeScrapeJobData {
  country: string;
  website: string;
  keyword: string;
}

async function processEuropeScrape(job: Job<EuropeScrapeJobData>) {
  const { country, website, keyword } = job.data;
  logger.info({ jobId: job.id, country, website, keyword }, 'Europe scrape job started');
  const result = await runEuropeScrape({ country, website, keyword });
  logger.info({ jobId: job.id, ...result, country, website }, 'Europe scrape job finished');
  return result;
}

export function createEuropeScrapeWorker() {
  const worker = new Worker<EuropeScrapeJobData>('europe-scrape', processEuropeScrape, {
    connection: redis,
    concurrency: 1, // Playwright is heavy — one site at a time
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, err, data: job?.data },
      'Europe scrape job failed',
    );
  });

  return worker;
}
