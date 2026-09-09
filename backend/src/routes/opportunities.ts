import { Router } from 'express';
import type { Request, Response } from 'express';
import { OpportunityStage } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import {
  syncOpportunitiesFromIntelligence,
  updateOpportunityStage,
} from '../services/opportunity.engine.js';
import { enqueuePitchForOpportunity } from '../services/pitch.service.js';

export const opportunitiesRouter = Router();

const STAGES = new Set(Object.values(OpportunityStage));

opportunitiesRouter.get('/', async (req: Request, res: Response) => {
  const stage = req.query.stage as string | undefined;
  const country = req.query.country as string | undefined;
  const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;

  const where: {
    stage?: OpportunityStage;
    country?: string;
    score?: { gte: number };
  } = {};

  if (stage && STAGES.has(stage as OpportunityStage)) {
    where.stage = stage as OpportunityStage;
  }
  if (country) where.country = country;
  if (minScore != null && !Number.isNaN(minScore)) {
    where.score = { gte: minScore };
  }

  const opportunities = await prisma.opportunity.findMany({
    where,
    orderBy: [{ rank: 'asc' }, { score: 'desc' }],
    take: 200,
    include: {
      companyIntelligence: {
        select: {
          signals: true,
          whatToSell: true,
          avgJobConfidence: true,
        },
      },
      feedbackEvents: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          outcome: true,
          notes: true,
          recordedBy: true,
          createdAt: true,
        },
      },
    },
  });

  const byStage = await prisma.opportunity.groupBy({
    by: ['stage'],
    _count: { _all: true },
  });

  res.json({
    opportunities: opportunities.map((o) => {
      const latest = o.feedbackEvents[0] ?? null;
      return {
        id: o.id,
        companyName: o.companyName,
        country: o.country,
        stage: o.stage,
        rank: o.rank,
        score: o.score,
        recommendedOffering: o.recommendedOffering,
        offeringCode: o.offeringCode,
        whyNow: o.whyNow,
        qualificationReason: o.qualificationReason,
        topDomain: o.topDomain,
        jobCount: o.jobCount,
        notes: o.notes,
        signals: o.companyIntelligence.signals
          ? o.companyIntelligence.signals.split(' | ').map((s) => s.trim()).filter(Boolean)
          : [],
        whatToSell: o.companyIntelligence.whatToSell,
        avgJobConfidence: o.companyIntelligence.avgJobConfidence,
        latestFeedback: latest
          ? {
              id: latest.id,
              outcome: latest.outcome,
              notes: latest.notes,
              recordedBy: latest.recordedBy,
              createdAt: latest.createdAt.toISOString(),
            }
          : null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        stageUpdatedAt: o.stageUpdatedAt?.toISOString() ?? null,
      };
    }),
    summary: Object.fromEntries(
      byStage.map((s) => [s.stage, s._count._all]),
    ),
  });
});

/** Rebuild opportunities from all DONE company intelligence rows. */
opportunitiesRouter.post('/sync', async (_req: Request, res: Response) => {
  try {
    const result = await syncOpportunitiesFromIntelligence();
    res.json({
      status: 'ok',
      message: `Synced ${result.upserted} opportunities (${result.skipped} skipped).`,
      ...result,
    });
  } catch (err) {
    logger.error({ err }, 'Opportunity sync failed');
    res.status(500).json({ error: 'Failed to sync opportunities' });
  }
});

opportunitiesRouter.patch('/:id/stage', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stage, notes } = req.body as { stage?: string; notes?: string };

  if (!stage || !STAGES.has(stage as OpportunityStage)) {
    res.status(400).json({
      error: `stage must be one of: ${[...STAGES].join(', ')}`,
    });
    return;
  }

  try {
    const updated = await updateOpportunityStage(
      id,
      stage as OpportunityStage,
      notes,
    );

    if (['QUALIFIED', 'NURTURE', 'CONTACTED'].includes(updated.stage)) {
      try {
        await enqueuePitchForOpportunity(updated.id);
      } catch (pitchErr) {
        logger.error({ err: pitchErr }, 'Failed to enqueue pitch after stage update');
      }
    }

    res.json({
      id: updated.id,
      stage: updated.stage,
      stageUpdatedAt: updated.stageUpdatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    logger.error({ err, id }, 'Failed to update opportunity stage');
    res.status(404).json({ error: 'Opportunity not found' });
  }
});
