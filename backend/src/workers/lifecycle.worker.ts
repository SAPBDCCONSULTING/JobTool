import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { lifecycleQueue } from '../lib/queue.js';

export function createLifecycleWorker() {
  const worker = new Worker(
    'lifecycle',
    async (job) => {
      if (job.name !== 'daily-sweep') return;

      const cutoff = new Date(Date.now() - env.JOB_STALE_DAYS * 24 * 60 * 60 * 1000);

      // Active → INACTIVE (not observed for JOB_STALE_DAYS)
      const deactivated = await prisma.cleanJob.updateMany({
        where: { lifecycleStatus: 'ACTIVE', lastSeenAt: { lt: cutoff } },
        data: { lifecycleStatus: 'INACTIVE' },
      });

      // Re-observed INACTIVE jobs come back to ACTIVE
      const reactivated = await prisma.cleanJob.updateMany({
        where: { lifecycleStatus: 'INACTIVE', lastSeenAt: { gte: cutoff } },
        data: { lifecycleStatus: 'ACTIVE' },
      });

      logger.info(
        { deactivated: deactivated.count, reactivated: reactivated.count, staleDays: env.JOB_STALE_DAYS },
        'Lifecycle sweep complete',
      );
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Lifecycle job failed');
  });
  worker.on('error', (err) => {
    logger.error({ err }, 'Lifecycle worker error');
  });

  return worker;
}

/** Register the daily lifecycle sweep. Idempotent via fixed jobId. */
export async function registerLifecycleRepeatable() {
  await lifecycleQueue.add(
    'daily-sweep',
    {},
    {
      repeat: { pattern: '0 4 * * *' }, // daily at 04:00
      jobId: 'daily-sweep',
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
  logger.info('Lifecycle daily sweep registered (04:00)');
}