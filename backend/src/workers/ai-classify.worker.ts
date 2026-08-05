import { Worker } from 'bullmq';
import { Prisma } from '@prisma/client';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { aiQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { classifyJob } from '../services/ai-classifier.service.js';

const BATCH_SIZE = 10;

interface PendingJobRow {
  id: string;
  jobTitle: string;
  jobDescription: string;
  companyName: string;
}

export function createAiClassifyWorker() {
  const worker = new Worker(
    'ai-classify',
    async (job) => {
      logger.info({ jobId: job.id }, 'AI worker: starting batch classification');

      // ── Atomically claim a batch using FOR UPDATE SKIP LOCKED ──
      const jobs = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<PendingJobRow[]>(
          Prisma.sql`
            SELECT id, "jobTitle", "jobDescription", "companyName"
            FROM clean_jobs
            WHERE "aiStatus" = 'PENDING'::"AiStatus"
            ORDER BY "createdAt" ASC
            LIMIT ${BATCH_SIZE}
            FOR UPDATE SKIP LOCKED
          `,
        );

        if (rows.length > 0) {
          await tx.cleanJob.updateMany({
            where: { id: { in: rows.map((r) => r.id) } },
            data: { aiStatus: 'PROCESSING' },
          });
        }

        return rows;
      });

      if (jobs.length === 0) {
        logger.info('AI worker: no pending jobs to classify');
        return;
      }

      logger.info({ count: jobs.length }, 'AI worker: classifying batch');

      // ── Process each job individually ──────────────────────────
      let success = 0;
      let failed = 0;

      for (const pendingJob of jobs) {
        try {
          const result = await classifyJob({
            jobTitle: pendingJob.jobTitle,
            jobDescription: pendingJob.jobDescription,
            companyName: pendingJob.companyName,
          });

          await prisma.cleanJob.update({
            where: { id: pendingJob.id },
            data: {
              aiStatus: 'DONE',
              confidence: result.confidence,
              aiReason: result.reason,
              aiProcessedAt: new Date(),
            },
          });

          success++;
          logger.debug(
            { id: pendingJob.id, confidence: result.confidence },
            'Job classified successfully',
          );
        } catch (err) {
          failed++;
          logger.error({ err, id: pendingJob.id }, 'Failed to classify job');
          await prisma.cleanJob.update({
            where: { id: pendingJob.id },
            data: { aiStatus: 'FAILED' },
          });
        }
      }

      logger.info({ success, failed, total: jobs.length }, 'AI worker: batch complete');

      // ── If full batch, there may be more — chain next batch ────
      if (jobs.length === BATCH_SIZE) {
        await aiQueue.add(
          'process-batch',
          { triggeredBy: 'chained', parentJobId: job.id },
          { delay: 500 },
        );
        logger.info('AI worker: chained next batch');
      }
    },
    {
      connection: redis,
      concurrency: 1, // One batch at a time to respect OpenAI rate limits
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'AI classify job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'AI classify job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'AI worker error');
  });

  return worker;
}
