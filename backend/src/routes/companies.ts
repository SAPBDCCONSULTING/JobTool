import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { enqueuePendingCompanyIntelligence } from '../services/company-intel.service.js';
import { logger } from '../lib/logger.js';

export const companiesRouter = Router();

interface CompanyRow {
  companyName: string;
  country: string;
  jobCount: number;
  avgConfidence: number | null;
  topDomain: string | null;
  opportunityScore: number | null;
  whyNow: string | null;
  whatToSell: string | null;
  signals: string | null;
  intelStatus: string | null;
}

companiesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const companies = await prisma.$queryRaw<CompanyRow[]>(
      Prisma.sql`
        SELECT
          outer_cj."companyName",
          outer_cj.country,
          COUNT(*)::int AS "jobCount",
          ROUND(AVG(outer_cj.confidence)::numeric, 3)::float AS "avgConfidence",
          (
            SELECT domain
            FROM clean_jobs inner_cj
            WHERE inner_cj."companyName" = outer_cj."companyName"
              AND inner_cj.country = outer_cj.country
              AND domain IS NOT NULL
            GROUP BY domain
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) AS "topDomain",
          ci."opportunityScore",
          ci."whyNow",
          ci."whatToSell",
          ci.signals,
          ci."aiStatus"::text AS "intelStatus"
        FROM clean_jobs outer_cj
        LEFT JOIN company_intelligence ci
          ON ci."companyName" = outer_cj."companyName"
         AND ci.country = outer_cj.country
        WHERE outer_cj."aiStatus" = 'DONE'::"AiStatus"
        GROUP BY
          outer_cj."companyName",
          outer_cj.country,
          ci."opportunityScore",
          ci."whyNow",
          ci."whatToSell",
          ci.signals,
          ci."aiStatus"
        ORDER BY
          ci."opportunityScore" DESC NULLS LAST,
          AVG(outer_cj.confidence) DESC NULLS LAST
        LIMIT 200
      `,
    );

    res.json({
      companies: companies.map((c) => ({
        companyName: c.companyName,
        country: c.country,
        jobCount: Number(c.jobCount),
        avgConfidence: c.avgConfidence,
        topDomain: c.topDomain,
        opportunityScore: c.opportunityScore,
        whyNow: c.whyNow,
        whatToSell: c.whatToSell,
        signals: c.signals
          ? c.signals.split(' | ').map((s) => s.trim()).filter(Boolean)
          : [],
        intelStatus: c.intelStatus,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list companies');
    res.status(500).json({
      error: 'Failed to load companies. Ensure migrations are applied (prisma migrate deploy).',
    });
  }
});

/** Discover + queue company intelligence for companies missing analysis. */
companiesRouter.post('/analyze', async (_req: Request, res: Response) => {
  try {
    const queued = await enqueuePendingCompanyIntelligence();
    res.json({
      status: 'queued',
      message:
        queued > 0
          ? `Queued company intelligence for up to ${queued} companies.`
          : 'No companies pending analysis.',
      queued,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to queue company intelligence');
    res.status(500).json({ error: 'Failed to queue company analysis' });
  }
});
