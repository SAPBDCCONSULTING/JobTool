import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
export const statsRouter = Router();
statsRouter.get('/', async (_req, res) => {
    const [totalRaw, totalClean, totalProcessed, relevantJobs, pendingCount, countriesResult, domainsResult, recentJobs,] = await Promise.all([
        prisma.rawJob.count(),
        prisma.cleanJob.count(),
        prisma.cleanJob.count({ where: { aiStatus: 'DONE' } }),
        prisma.cleanJob.count({
            where: { aiStatus: 'DONE', relevanceScore: { gte: env.MIN_JOB_RELEVANCE } },
        }),
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
            where: { aiStatus: 'DONE' },
            orderBy: [{ relevanceScore: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
            select: {
                id: true,
                jobTitle: true,
                companyName: true,
                country: true,
                relevanceScore: true,
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
        relevantJobs,
        pendingCount,
        countries: countriesResult.map((c) => ({ name: c.country, count: c._count.id })),
        domains: domainsResult
            .filter((d) => d.domain)
            .map((d) => ({ name: d.domain, count: d._count.id })),
        recentJobs,
    });
});
//# sourceMappingURL=stats.js.map