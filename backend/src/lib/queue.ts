import { Queue } from 'bullmq';
import { redis } from './redis.js';

// Queue for Apify ingestion jobs (triggered by POST /api/search + scheduler)
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

// Queue for AI company intelligence (opportunity score / why now / what to sell)
export const companyAiQueue = new Queue('ai-company', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 3000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

// Queue for AI pitch generation (angles + email)
export const pitchAiQueue = new Queue('ai-pitch', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 3000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

// Queue for Europe Playwright scrapes (manual via API or daily scheduler)
export const europeScrapeQueue = new Queue('europe-scrape', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 60_000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

/** Single orchestrator job that fans out LinkedIn + Europe scans every N hours. */
export const schedulerQueue = new Queue('scheduler', {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 50 },
  },
});
