import { Queue } from 'bullmq';
import { redisConnection } from './redis.js';
// Queue for LinkedIn (Apify) source fetches — one job per SourceRun
export const sourceFetchQueue = new Queue('source-fetch', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
    },
});
// Queue for European country-site scrapes (Playwright) — one job per SourceRun.
// Scraping is not retried automatically (anti-bot risk): the Runs UI offers retry.
export const countryScrapeQueue = new Queue('country-scrape', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
    },
});
// Queue for AI classification jobs (triggered by ingestion workers)
export const aiQueue = new Queue('ai-classify', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 2000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
    },
});
// Queue for the scheduler (repeatable "check due runs" job) and manual fan-out
export const schedulerQueue = new Queue('scheduler', {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
    },
});
// Queue for debounced company recalculation (metrics + AI + opportunity score).
// Jobs are keyed by companyId so repeated marks coalesce into one run.
export const companyIntelQueue = new Queue('company-intel', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 30_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 200 },
    },
});
// Queue for the daily job lifecycle sweep (ACTIVE/INACTIVE transitions)
export const lifecycleQueue = new Queue('lifecycle', {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: { count: 30 },
        removeOnFail: { count: 30 },
    },
});
// Queue for description enrichment (fetch full descriptions from detail pages).
// One job per job-id — the worker batches URLs into a single browser session.
export const descEnrichQueue = new Queue('desc-enrich', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 60_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 200 },
    },
});
//# sourceMappingURL=queue.js.map