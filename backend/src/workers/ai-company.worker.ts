import { Worker } from 'bullmq';
import { Prisma } from '@prisma/client';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { companyAiQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { analyzeCompany } from '../services/ai-company.service.js';
import { upsertOpportunityFromCompany } from '../services/opportunity.engine.js';

const BATCH_SIZE = 5;

interface PendingCompanyRow {
  id: string;
  companyName: string;
  country: string;
}

interface JobRow {
  jobTitle: string;
  domain: string | null;
  confidence: number | null;
  aiReason: string | null;
}

export function createAiCompanyWorker() {
  const worker = new Worker(
    'ai-company',
    async (job) => {
      logger.info({ jobId: job.id }, 'Company AI worker: starting batch');

      const companies = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<PendingCompanyRow[]>(
          Prisma.sql`
            SELECT id, "companyName", country
            FROM company_intelligence
            WHERE "aiStatus" = 'PENDING'::"AiStatus"
            ORDER BY "updatedAt" ASC
            LIMIT ${BATCH_SIZE}
            FOR UPDATE SKIP LOCKED
          `,
        );

        if (rows.length > 0) {
          await tx.companyIntelligence.updateMany({
            where: { id: { in: rows.map((r) => r.id) } },
            data: { aiStatus: 'PROCESSING' },
          });
        }

        return rows;
      });

      if (companies.length === 0) {
        logger.info('Company AI worker: no pending companies');
        return;
      }

      let success = 0;
      let failed = 0;

      for (const company of companies) {
        try {
          const jobs = await prisma.cleanJob.findMany({
            where: {
              companyName: company.companyName,
              country: company.country,
              aiStatus: 'DONE',
            },
            select: {
              jobTitle: true,
              domain: true,
              confidence: true,
              aiReason: true,
            },
            orderBy: { confidence: 'desc' },
            take: 25,
          });

          if (jobs.length === 0) {
            await prisma.companyIntelligence.update({
              where: { id: company.id },
              data: {
                aiStatus: 'FAILED',
                whyNow: 'No classified jobs available for analysis.',
              },
            });
            failed++;
            continue;
          }

          const confidences = jobs
            .map((j) => j.confidence)
            .filter((c): c is number => c != null);
          const avgJobConfidence =
            confidences.length > 0
              ? confidences.reduce((a, b) => a + b, 0) / confidences.length
              : null;

          const domainCounts = new Map<string, number>();
          for (const j of jobs) {
            if (j.domain) {
              domainCounts.set(j.domain, (domainCounts.get(j.domain) || 0) + 1);
            }
          }
          let topDomain: string | null = null;
          let topCount = 0;
          for (const [d, n] of domainCounts) {
            if (n > topCount) {
              topDomain = d;
              topCount = n;
            }
          }

          const result = await analyzeCompany({
            companyName: company.companyName,
            country: company.country,
            jobs: jobs as JobRow[],
            topDomain,
            avgConfidence: avgJobConfidence,
          });

          await prisma.companyIntelligence.update({
            where: { id: company.id },
            data: {
              aiStatus: 'DONE',
              opportunityScore: result.opportunityScore,
              whyNow: result.whyNow,
              whatToSell: result.whatToSell,
              signals: result.signals.join(' | '),
              jobCountAtAnalysis: jobs.length,
              avgJobConfidence,
              topDomain,
              aiProcessedAt: new Date(),
            },
          });

          try {
            await upsertOpportunityFromCompany(company.id);
          } catch (oppErr) {
            logger.error(
              { err: oppErr, companyId: company.id },
              'Failed to upsert opportunity after company AI',
            );
          }

          success++;
          logger.debug(
            {
              company: company.companyName,
              score: result.opportunityScore,
            },
            'Company intelligence saved',
          );
        } catch (err) {
          failed++;
          logger.error({ err, id: company.id }, 'Failed to analyze company');
          await prisma.companyIntelligence.update({
            where: { id: company.id },
            data: { aiStatus: 'FAILED' },
          });
        }
      }

      logger.info(
        { success, failed, total: companies.length },
        'Company AI worker: batch complete',
      );

      if (companies.length === BATCH_SIZE) {
        await companyAiQueue.add(
          'analyze-batch',
          { triggeredBy: 'chained', parentJobId: job.id },
          { delay: 800 },
        );
        logger.info('Company AI worker: chained next batch');
      }
    },
    {
      connection: redis,
      concurrency: 1,
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Company AI job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Company AI job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Company AI worker error');
  });

  return worker;
}
