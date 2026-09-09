import { Router } from 'express';
import type { Request, Response } from 'express';
import { FeedbackOutcome } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { listFeedback, recordFeedback } from '../services/feedback.service.js';

export const feedbackRouter = Router();

const OUTCOMES = new Set(Object.values(FeedbackOutcome));

feedbackRouter.get('/', async (req: Request, res: Response) => {
  try {
    const opportunityId = req.query.opportunityId as string | undefined;
    const outcome = req.query.outcome as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 100;

    if (outcome && !OUTCOMES.has(outcome as FeedbackOutcome)) {
      res.status(400).json({
        error: `outcome must be one of: ${[...OUTCOMES].join(', ')}`,
      });
      return;
    }

    const data = await listFeedback({
      opportunityId,
      outcome: outcome as FeedbackOutcome | undefined,
      limit: Number.isFinite(limit) ? limit : 100,
    });
    res.json(data);
  } catch (err) {
    logger.error({ err }, 'Failed to list feedback');
    res.status(500).json({ error: 'Failed to list feedback' });
  }
});

feedbackRouter.post('/', async (req: Request, res: Response) => {
  const { opportunityId, outcome, notes, recordedBy } = req.body as {
    opportunityId?: string;
    outcome?: string;
    notes?: string;
    recordedBy?: string;
  };

  if (!opportunityId || !outcome) {
    res.status(400).json({ error: 'opportunityId and outcome are required' });
    return;
  }
  if (!OUTCOMES.has(outcome as FeedbackOutcome)) {
    res.status(400).json({
      error: `outcome must be one of: ${[...OUTCOMES].join(', ')}`,
    });
    return;
  }

  try {
    const result = await recordFeedback({
      opportunityId,
      outcome: outcome as FeedbackOutcome,
      notes,
      recordedBy,
    });
    res.status(201).json({
      status: 'ok',
      message: `Recorded ${outcome} for opportunity`,
      ...result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to record feedback';
    logger.error({ err }, 'Failed to record feedback');
    res.status(msg.includes('not found') ? 404 : 500).json({ error: msg });
  }
});
