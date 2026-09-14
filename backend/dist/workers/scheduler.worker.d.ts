import { Worker } from 'bullmq';
export declare function createSchedulerWorker(): Worker<any, any, string>;
/**
 * Register the repeatable "check due runs" job.
 * Idempotent — BullMQ keyed on the fixed jobId.
 */
export declare function registerSchedulerRepeatable(): Promise<void>;
