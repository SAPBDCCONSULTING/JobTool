import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { schedulerQueue } from '../lib/queue.js';
import { enqueueDueRuns } from '../services/scheduler.service.js';

export function createSchedulerWorker() {
  const worker = new Worker(
    'scheduler',
    async (job) => {
      if (job.name === 'check-due-runs') {
        const created = await enqueueDueRuns();
        logger.info({ created, jobId: job.id }, 'Scheduler: due runs check complete');
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Scheduler job failed');
  });
  worker.on('error', (err) => {
    logger.error({ err }, 'Scheduler worker error');
  });

  return worker;
}

/**
 * Register the repeatable "check due runs" job.
 * Idempotent — BullMQ keyed on the fixed jobId.
 */
export async function registerSchedulerRepeatable() {
  await schedulerQueue.add(
    'check-due-runs',
    {},
    {
      repeat: { pattern: env.SCHEDULER_CRON_PATTERN },
      jobId: 'check-due-runs',
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
  logger.info({ pattern: env.SCHEDULER_CRON_PATTERN }, 'Scheduler repeatable job registered');
}