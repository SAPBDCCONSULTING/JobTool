import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AiStatus } from '@prisma/client';

export const jobsRouter = Router();

jobsRouter.get('/', async (req: Request, res: Response) => {
  const {
    country,
    minConfidence,
    domain,
    companyName,
    aiStatus,
    page = '1',
    limit = '20',
  } = req.query;

  const pageNum = Math.max(1, parseInt(String(page)));
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
  const skip = (pageNum - 1) * limitNum;

  // Build where clause
  const where: Parameters<typeof prisma.cleanJob.findMany>[0]['where'] = {};

  if (country) {
    where.country = { contains: String(country), mode: 'insensitive' };
  }
  if (minConfidence) {
    where.confidence = { gte: parseFloat(String(minConfidence)) };
  }
  if (domain) {
    where.domain = { contains: String(domain), mode: 'insensitive' };
  }
  if (companyName) {
    where.companyName = { contains: String(companyName), mode: 'insensitive' };
  }
  if (aiStatus) {
    where.aiStatus = String(aiStatus).toUpperCase() as AiStatus;
  }

  const [jobs, total] = await Promise.all([
    prisma.cleanJob.findMany({
      where,
      orderBy: [{ confidence: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: limitNum,
      skip,
      include: {
        rawJob: { select: { location: true } },
      },
    }),
    prisma.cleanJob.count({ where }),
  ]);

  res.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      jobTitle: j.jobTitle,
      companyName: j.companyName,
      country: j.country,
      location: j.rawJob?.location ?? null,
      domain: j.domain,
      aiStatus: j.aiStatus,
      confidence: j.confidence,
      aiReason: j.aiReason,
      searchString: j.searchString,
      createdAt: j.createdAt,
      aiProcessedAt: j.aiProcessedAt,
    })),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});
