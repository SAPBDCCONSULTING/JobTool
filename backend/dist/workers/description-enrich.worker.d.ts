import { Worker } from 'bullmq';
/**
 * Enrich jobs whose descriptions are missing: fetch the job detail page with
 * Playwright (batched into one browser session), extract the description,
 * store it, and re-queue the job for AI analysis with the full text.
 */
export declare function createDescriptionEnrichWorker(): Worker<any, any, string>;
/** Queue the next batch of jobs that need description enrichment. */
export declare function enqueueDescriptionEnrichment(limit?: number): Promise<number>;
/**
 * Register the repeatable "re-enqueue pending enrichments" job.
 * Runs every 30 minutes so jobs missing descriptions keep draining even if
 * new data arrives after the initial startup enqueue. Idempotent via jobId.
 */
export declare function registerEnrichRepeatable(): Promise<void>;
