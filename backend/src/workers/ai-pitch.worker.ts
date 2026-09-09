import { Worker } from 'bullmq';
import { Prisma } from '@prisma/client';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { pitchAiQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { generatePitch } from '../services/ai-pitch.service.js';
import { extractEmailsFromTexts } from '../lib/extract-emails.js';

const BATCH_SIZE = 5;

interface PendingPitchRow {
  id: string;
  opportunityId: string;
  companyName: string;
  country: string;
}

export function createAiPitchWorker() {
  const worker = new Worker(
    'ai-pitch',
    async (job) => {
      logger.info({ jobId: job.id }, 'Pitch AI worker: starting batch');

      const pitches = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<PendingPitchRow[]>(
          Prisma.sql`
            SELECT id, "opportunityId", "companyName", country
            FROM pitches
            WHERE "aiStatus" = 'PENDING'::"AiStatus"
            ORDER BY "updatedAt" ASC
            LIMIT ${BATCH_SIZE}
            FOR UPDATE SKIP LOCKED
          `,
        );

        if (rows.length > 0) {
          await tx.pitch.updateMany({
            where: { id: { in: rows.map((r) => r.id) } },
            data: { aiStatus: 'PROCESSING' },
          });
        }

        return rows;
      });

      if (pitches.length === 0) {
        logger.info('Pitch AI worker: no pending pitches');
        return;
      }

      let success = 0;
      let failed = 0;

      for (const pitch of pitches) {
        try {
          const opp = await prisma.opportunity.findUnique({
            where: { id: pitch.opportunityId },
            include: {
              companyIntelligence: {
                select: { signals: true, whatToSell: true },
              },
            },
          });

          if (!opp) {
            await prisma.pitch.update({
              where: { id: pitch.id },
              data: { aiStatus: 'FAILED' },
            });
            failed++;
            continue;
          }

          const signals = opp.companyIntelligence.signals
            ? opp.companyIntelligence.signals.split(' | ').map((s) => s.trim()).filter(Boolean)
            : [];

          // Pull emails from this company's classified job descriptions
          const jobs = await prisma.cleanJob.findMany({
            where: {
              companyName: opp.companyName,
              country: opp.country,
              aiStatus: 'DONE',
            },
            select: { jobDescription: true, jobTitle: true },
            take: 40,
          });
          const contactEmails = extractEmailsFromTexts(
            jobs.flatMap((j) => [j.jobDescription, j.jobTitle]),
          );

          const result = await generatePitch({
            companyName: opp.companyName,
            country: opp.country,
            score: opp.score,
            stage: opp.stage,
            recommendedOffering: opp.recommendedOffering,
            offeringCode: opp.offeringCode,
            whyNow: opp.whyNow,
            topDomain: opp.topDomain,
            jobCount: opp.jobCount,
            signals,
            whatToSell: opp.companyIntelligence.whatToSell,
            contactEmails,
          });

          await prisma.pitch.update({
            where: { id: pitch.id },
            data: {
              aiStatus: 'DONE',
              angles: result.angles.join(' | '),
              emailSubject: result.emailSubject,
              emailBody: result.emailBody,
              personalizationNotes: result.personalizationNotes,
              callToAction: result.callToAction,
              contactEmails: contactEmails.length ? contactEmails.join(' | ') : null,
              aiProcessedAt: new Date(),
            },
          });

          success++;
          logger.debug(
            {
              company: opp.companyName,
              subject: result.emailSubject,
              contactEmails: contactEmails.length,
            },
            'Pitch generated',
          );
        } catch (err) {
          failed++;
          logger.error({ err, id: pitch.id }, 'Failed to generate pitch');
          await prisma.pitch.update({
            where: { id: pitch.id },
            data: { aiStatus: 'FAILED' },
          });
        }
      }

      logger.info(
        { success, failed, total: pitches.length },
        'Pitch AI worker: batch complete',
      );

      if (pitches.length === BATCH_SIZE) {
        await pitchAiQueue.add(
          'generate-batch',
          { triggeredBy: 'chained', parentJobId: job.id },
          { delay: 800 },
        );
        logger.info('Pitch AI worker: chained next batch');
      }
    },
    {
      connection: redis,
      concurrency: 1,
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Pitch AI job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Pitch AI job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Pitch AI worker error');
  });

  return worker;
}
