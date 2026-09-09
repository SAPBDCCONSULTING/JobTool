import type { FeedbackOutcome, OpportunityStage } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { enqueuePitchForOpportunity } from './pitch.service.js';

/** Map feedback outcome → opportunity pipeline stage */
export function outcomeToStage(outcome: FeedbackOutcome): OpportunityStage {
  return outcome as OpportunityStage;
}

export async function recordFeedback(input: {
  opportunityId: string;
  outcome: FeedbackOutcome;
  notes?: string;
  recordedBy?: string;
}): Promise<{
  event: {
    id: string;
    opportunityId: string;
    outcome: FeedbackOutcome;
    notes: string | null;
    recordedBy: string | null;
    createdAt: string;
  };
  stage: OpportunityStage;
}> {
  const opp = await prisma.opportunity.findUnique({
    where: { id: input.opportunityId },
  });
  if (!opp) {
    throw new Error('Opportunity not found');
  }

  const stage = outcomeToStage(input.outcome);

  const [event] = await prisma.$transaction([
    prisma.feedbackEvent.create({
      data: {
        opportunityId: input.opportunityId,
        outcome: input.outcome,
        notes: input.notes?.trim() || null,
        recordedBy: input.recordedBy?.trim() || 'team',
      },
    }),
    prisma.opportunity.update({
      where: { id: input.opportunityId },
      data: {
        stage,
        stageUpdatedAt: new Date(),
        ...(input.notes !== undefined
          ? { notes: input.notes.trim() || opp.notes }
          : {}),
      },
    }),
  ]);

  // Contacted+ often needs a pitch ready
  if (['CONTACTED', 'REPLIED', 'MEETING'].includes(input.outcome)) {
    try {
      await enqueuePitchForOpportunity(input.opportunityId);
    } catch (err) {
      logger.error({ err }, 'Failed to enqueue pitch after feedback');
    }
  }

  logger.info(
    {
      opportunityId: input.opportunityId,
      company: opp.companyName,
      outcome: input.outcome,
    },
    'Feedback recorded',
  );

  return {
    event: {
      id: event.id,
      opportunityId: event.opportunityId,
      outcome: event.outcome,
      notes: event.notes,
      recordedBy: event.recordedBy,
      createdAt: event.createdAt.toISOString(),
    },
    stage,
  };
}

export async function listFeedback(options?: {
  opportunityId?: string;
  outcome?: FeedbackOutcome;
  limit?: number;
}) {
  const events = await prisma.feedbackEvent.findMany({
    where: {
      ...(options?.opportunityId ? { opportunityId: options.opportunityId } : {}),
      ...(options?.outcome ? { outcome: options.outcome } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
    include: {
      opportunity: {
        select: {
          id: true,
          companyName: true,
          country: true,
          score: true,
          rank: true,
          stage: true,
          recommendedOffering: true,
          topDomain: true,
        },
      },
    },
  });

  const byOutcome = await prisma.feedbackEvent.groupBy({
    by: ['outcome'],
    _count: { _all: true },
  });

  // Latest outcome per opportunity (for funnel of current state)
  const stageFunnel = await prisma.opportunity.groupBy({
    by: ['stage'],
    where: {
      stage: {
        in: ['REVIEWED', 'CONTACTED', 'REPLIED', 'MEETING', 'WON', 'LOST'],
      },
    },
    _count: { _all: true },
  });

  return {
    events: events.map((e) => ({
      id: e.id,
      opportunityId: e.opportunityId,
      outcome: e.outcome,
      notes: e.notes,
      recordedBy: e.recordedBy,
      createdAt: e.createdAt.toISOString(),
      opportunity: e.opportunity,
    })),
    summary: Object.fromEntries(
      byOutcome.map((o) => [o.outcome, o._count._all]),
    ),
    pipeline: Object.fromEntries(
      stageFunnel.map((s) => [s.stage, s._count._all]),
    ),
  };
}
