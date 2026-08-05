import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

export const companiesRouter = Router();

interface CompanyRow {
  companyName: string;
  country: string;
  jobCount: number;
  avgConfidence: number | null;
  topDomain: string | null;
}

companiesRouter.get('/', async (_req: Request, res: Response) => {
  const companies = await prisma.$queryRaw<CompanyRow[]>(
    Prisma.sql`
      SELECT
        "companyName",
        country,
        COUNT(*)::int AS "jobCount",
        ROUND(AVG(confidence)::numeric, 3)::float AS "avgConfidence",
        (
          SELECT domain
          FROM clean_jobs inner_cj
          WHERE inner_cj."companyName" = outer_cj."companyName"
            AND domain IS NOT NULL
          GROUP BY domain
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) AS "topDomain"
      FROM clean_jobs outer_cj
      WHERE "aiStatus" = 'DONE'::"AiStatus"
      GROUP BY "companyName", country
      ORDER BY AVG(confidence) DESC NULLS LAST
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
    })),
  });
});
