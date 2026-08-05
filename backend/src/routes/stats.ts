import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const statsRouter = Router();

statsRouter.get('/', async (_req: Request, res: Response) => {
  const [
    totalRaw,
    totalClean,
    totalProcessed,
    highConfidence,
    pendingCount,
    countriesResult,
    domainsResult,
    recentJobs,
  ] = await Promise.all([
    prisma.rawJob.count(),
    prisma.cleanJob.count(),
    prisma.cleanJob.count({ where: { aiStatus: 'DONE' } }),
    prisma.cleanJob.count({ where: { confidence: { gte: 0.7 } } }),
    prisma.cleanJob.count({ where: { aiStatus: { in: ['PENDING', 'PROCESSING'] } } }),
    prisma.cleanJob.groupBy({
      by: ['country'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.cleanJob.groupBy({
      by: ['domain'],
      where: { domain: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    }),
    prisma.cleanJob.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        country: true,
        confidence: true,
        aiStatus: true,
        domain: true,
        createdAt: true,
      },
    }),
  ]);

  res.json({
    totalRaw,
    totalClean,
    totalProcessed,
    highConfidence,
    pendingCount,
    countries: countriesResult.map((c) => ({ name: c.country, count: c._count.id })),
    domains: domainsResult
      .filter((d) => d.domain)
      .map((d) => ({ name: d.domain!, count: d._count.id })),
    recentJobs,
  });
});
