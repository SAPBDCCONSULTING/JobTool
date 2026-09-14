import { Worker } from 'bullmq';
export declare function createLifecycleWorker(): Worker<any, any, string>;
/** Register the daily lifecycle sweep. Idempotent via fixed jobId. */
export declare function registerLifecycleRepeatable(): Promise<void>;
