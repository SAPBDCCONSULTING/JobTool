import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import {
  enqueuePendingPitches,
  enqueuePitchForOpportunity,
} from '../services/pitch.service.js';

export const pitchesRouter = Router();

pitchesRouter.get('/', async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const country = req.query.country as string | undefined;

  const where: {
    aiStatus?: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
    country?: string;
  } = {};

  if (status && ['PENDING', 'PROCESSING', 'DONE', 'FAILED'].includes(status)) {
    where.aiStatus = status as typeof where.aiStatus;
  }
  if (country) where.country = country;

  const pitches = await prisma.pitch.findMany({
    where,
    orderBy: [{ aiProcessedAt: 'desc' }, { updatedAt: 'desc' }],
    take: 200,
    include: {
      opportunity: {
        select: {
          id: true,
          stage: true,
          score: true,
          rank: true,
          recommendedOffering: true,
          offeringCode: true,
          whyNow: true,
          topDomain: true,
          jobCount: true,
        },
      },
    },
  });

  const byStatus = await prisma.pitch.groupBy({
    by: ['aiStatus'],
    _count: { _all: true },
  });

  res.json({
    pitches: pitches.map((p) => ({
      id: p.id,
      opportunityId: p.opportunityId,
      companyName: p.companyName,
      country: p.country,
      angles: p.angles
        ? p.angles.split(' | ').map((s) => s.trim()).filter(Boolean)
        : [],
      emailSubject: p.emailSubject,
      emailBody: p.emailBody,
      personalizationNotes: p.personalizationNotes,
      callToAction: p.callToAction,
      contactEmails: p.contactEmails
        ? p.contactEmails.split(' | ').map((s) => s.trim()).filter(Boolean)
        : [],
      aiStatus: p.aiStatus,
      aiProcessedAt: p.aiProcessedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      opportunity: p.opportunity,
    })),
    summary: Object.fromEntries(
      byStatus.map((s) => [s.aiStatus, s._count._all]),
    ),
  });
});

/** Queue pitch generation for eligible opportunities. */
pitchesRouter.post('/generate', async (_req: Request, res: Response) => {
  try {
    const queued = await enqueuePendingPitches();
    res.json({
      status: 'queued',
      message:
        queued > 0
          ? `Queued pitch generation for ${queued} opportunities.`
          : 'No opportunities pending pitch generation.',
      queued,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to queue pitches');
    res.status(500).json({ error: 'Failed to queue pitch generation' });
  }
});

/** Force regenerate a single pitch. */
pitchesRouter.post('/:id/regenerate', async (req: Request, res: Response) => {
  try {
    const pitch = await prisma.pitch.findUnique({
      where: { id: req.params.id },
    });
    if (!pitch) {
      res.status(404).json({ error: 'Pitch not found' });
      return;
    }
    await enqueuePitchForOpportunity(pitch.opportunityId, { force: true });
    res.json({
      status: 'queued',
      message: `Regenerating pitch for ${pitch.companyName}`,
      opportunityId: pitch.opportunityId,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to regenerate pitch');
    res.status(500).json({ error: 'Failed to regenerate pitch' });
  }
});
