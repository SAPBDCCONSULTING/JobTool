import { prisma } from '../lib/prisma.js';
import { pitchAiQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';

const PITCH_ELIGIBLE_STAGES = new Set(['QUALIFIED', 'NURTURE', 'CONTACTED']);

/**
 * Create/reset a pitch row for an opportunity and enqueue AI generation.
 * Only for QUALIFIED / NURTURE / CONTACTED stages.
 */
export async function enqueuePitchForOpportunity(
  opportunityId: string,
  options?: { force?: boolean },
): Promise<boolean> {
  const opp = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opp) return false;
  if (!PITCH_ELIGIBLE_STAGES.has(opp.stage) && !options?.force) {
    return false;
  }

  const existing = await prisma.pitch.findUnique({
    where: { opportunityId },
  });

  // Skip re-queue if already DONE unless force
  if (existing?.aiStatus === 'DONE' && !options?.force) {
    return false;
  }

  await prisma.pitch.upsert({
    where: { opportunityId },
    create: {
      opportunityId,
      companyName: opp.companyName,
      country: opp.country,
      aiStatus: 'PENDING',
    },
    update: {
      companyName: opp.companyName,
      country: opp.country,
      aiStatus: 'PENDING',
      angles: null,
      emailSubject: null,
      emailBody: null,
      personalizationNotes: null,
      callToAction: null,
      contactEmails: null,
      aiProcessedAt: null,
    },
  });

  await pitchAiQueue.add('generate-batch', {
    triggeredBy: 'opportunity',
    opportunityId,
  });

  logger.info(
    { opportunityId, company: opp.companyName },
    'Pitch generation queued',
  );
  return true;
}

/** Queue pitches for all eligible opportunities missing a DONE pitch. */
export async function enqueuePendingPitches(): Promise<number> {
  const opps = await prisma.opportunity.findMany({
    where: {
      stage: { in: ['QUALIFIED', 'NURTURE', 'CONTACTED'] },
      OR: [
        { pitch: null },
        { pitch: { aiStatus: { in: ['PENDING', 'FAILED'] } } },
      ],
    },
    select: { id: true },
    take: 100,
  });

  let queued = 0;
  for (const opp of opps) {
    const ok = await enqueuePitchForOpportunity(opp.id, { force: false });
    if (ok) queued++;
  }

  // Also drain any PENDING pitch rows already created
  const pendingCount = await prisma.pitch.count({ where: { aiStatus: 'PENDING' } });
  if (pendingCount > 0 && queued === 0) {
    await pitchAiQueue.add('generate-batch', {
      triggeredBy: 'manual-refresh',
      count: pendingCount,
    });
    return pendingCount;
  }

  return queued || pendingCount;
}
