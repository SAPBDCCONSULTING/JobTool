import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { ingestJobs } from '../services/ingest.service.js';

export function createIngestionWorker() {
  const worker = new Worker(
    'ingestion',
    async (job) => {
      const { keyword, location } = job.data as { keyword: string; location: string };
      logger.info({ keyword, location, jobId: job.id }, 'Ingestion worker: processing job');

      await ingestJobs(keyword, location);

      logger.info({ keyword, location, jobId: job.id }, 'Ingestion worker: job complete');
    },
    {
      connection: redis,
      concurrency: 1, // Process one ingestion at a time to avoid API rate limits
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Ingestion job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id, name: job?.name }, 'Ingestion job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Ingestion worker error');
  });

  return worker;
}
