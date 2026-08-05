import { Queue } from 'bullmq';
import { redis } from './redis.js';

// Queue for Apify ingestion jobs (triggered by POST /api/search)
export const ingestionQueue = new Queue('ingestion', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

// Queue for AI classification jobs (triggered by ingestion worker)
export const aiQueue = new Queue('ai-classify', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 2000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});
