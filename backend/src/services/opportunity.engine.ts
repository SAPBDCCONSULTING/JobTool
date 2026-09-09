import type { OpportunityStage } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { enqueuePitchForOpportunity } from './pitch.service.js';

/** Minimum score to create / keep an opportunity row */
export const OPPORTUNITY_MIN_SCORE = 0.35;

/** Score thresholds for auto staging */
export const QUALIFY_SCORE = 0.7;
export const NURTURE_SCORE = 0.5;

const MANUAL_STAGES: OpportunityStage[] = [
  'REVIEWED',
  'CONTACTED',
  'REPLIED',
  'MEETING',
  'WON',
  'LOST',
];

export interface OfferingMapping {
  code: string;
  label: string;
}

/** Map domain + whatToSell text → recommended offering. */
export function mapRecommendedOffering(
  topDomain: string | null | undefined,
  whatToSell: string | null | undefined,
): OfferingMapping {
  const text = `${topDomain || ''} ${whatToSell || ''}`.toLowerCase();

  if (/s\/?4|s4hana|hana|rise with sap/.test(text)) {
    return { code: 'S4HANA_IMPLEMENTATION', label: 'SAP S/4HANA implementation & migration' };
  }
  if (/sap btp|btp|integration suite/.test(text)) {
    return { code: 'SAP_BTP', label: 'SAP BTP / Integration Suite delivery' };
  }
  if (/sap/.test(text) && /ams|support|managed/.test(text)) {
    return { code: 'SAP_AMS', label: 'SAP AMS / managed services' };
  }
  if (/sap|fico|mm |pp |wm /.test(text)) {
    return { code: 'SAP_CONSULTING', label: 'SAP consulting & programme delivery' };
  }
  if (/oracle.*erp|fusion|netsuite/.test(text) || (topDomain === 'ERP' && /oracle/.test(text))) {
    return { code: 'ORACLE_ERP', label: 'Oracle Cloud ERP implementation' };
  }
  if (/erp/.test(text) || topDomain === 'ERP') {
    return { code: 'ERP_TRANSFORMATION', label: 'ERP transformation programme' };
  }
  if (/azure|aws|gcp|landing zone|cloud migration|hybrid cloud/.test(text) || topDomain === 'Cloud') {
    return { code: 'CLOUD_MIGRATION', label: 'Cloud landing zone & migration factory' };
  }
  if (/data|analytics|lakehouse|databricks|snowflake|ml ops|ai /.test(text) || topDomain === 'Data & Analytics') {
    return { code: 'DATA_PLATFORM', label: 'Enterprise data platform & analytics' };
  }

  if (whatToSell?.trim()) {
    return { code: 'CUSTOM', label: whatToSell.trim().slice(0, 200) };
  }

  return { code: 'ADVISORY', label: 'Technology advisory & discovery workshop' };
}

export function qualifyStage(
  score: number,
  jobCount: number,
): { stage: OpportunityStage; reason: string } {
  if (score >= QUALIFY_SCORE && jobCount >= 1) {
    return {
      stage: 'QUALIFIED',
      reason: `Score ${score.toFixed(2)} ≥ ${QUALIFY_SCORE} with ${jobCount} classified job(s) — strong buying signal.`,
    };
  }
  if (score >= NURTURE_SCORE) {
    return {
      stage: 'NURTURE',
      reason: `Score ${score.toFixed(2)} in nurture band (${NURTURE_SCORE}–${QUALIFY_SCORE - 0.01}) — monitor and warm.`,
    };
  }
  if (score >= OPPORTUNITY_MIN_SCORE) {
    return {
      stage: 'NEW',
      reason: `Score ${score.toFixed(2)} above minimum — early signal, needs more evidence.`,
    };
  }
  return {
    stage: 'DISQUALIFIED',
    reason: `Score ${score.toFixed(2)} below ${OPPORTUNITY_MIN_SCORE} — weak investment signal.`,
  };
}

/**
 * Upsert a single opportunity from a company intelligence record,
 * then optionally refresh global ranks.
 */
export async function upsertOpportunityFromCompany(
  companyIntelligenceId: string,
  options?: { refreshRanks?: boolean },
): Promise<{ id: string; stage: OpportunityStage } | null> {
  const intel = await prisma.companyIntelligence.findUnique({
    where: { id: companyIntelligenceId },
  });

  if (!intel || intel.aiStatus !== 'DONE' || intel.opportunityScore == null) {
    return null;
  }

  const score = intel.opportunityScore;
  const jobCount = intel.jobCountAtAnalysis;
  const { stage: autoStage, reason } = qualifyStage(score, jobCount);
  const offering = mapRecommendedOffering(intel.topDomain, intel.whatToSell);

  // Below min: remove existing auto-managed opp, or skip create
  if (score < OPPORTUNITY_MIN_SCORE) {
    const existing = await prisma.opportunity.findUnique({
      where: { companyIntelligenceId },
    });
    if (existing && !MANUAL_STAGES.includes(existing.stage)) {
      await prisma.opportunity.update({
        where: { id: existing.id },
        data: {
          stage: 'DISQUALIFIED',
          score,
          rank: 0,
          recommendedOffering: offering.label,
          offeringCode: offering.code,
          whyNow: intel.whyNow,
          qualificationReason: reason,
          topDomain: intel.topDomain,
          jobCount,
          stageUpdatedAt: new Date(),
        },
      });
      if (options?.refreshRanks !== false) await refreshOpportunityRanks();
      return { id: existing.id, stage: 'DISQUALIFIED' };
    }
    if (!existing) return null;
  }

  const existing = await prisma.opportunity.findUnique({
    where: { companyIntelligenceId },
  });

  const preserveStage = existing && MANUAL_STAGES.includes(existing.stage);
  const stage = preserveStage ? existing.stage : autoStage;

  const opp = await prisma.opportunity.upsert({
    where: { companyIntelligenceId },
    create: {
      companyIntelligenceId,
      companyName: intel.companyName,
      country: intel.country,
      stage: autoStage,
      score,
      recommendedOffering: offering.label,
      offeringCode: offering.code,
      whyNow: intel.whyNow,
      qualificationReason: reason,
      topDomain: intel.topDomain,
      jobCount,
      stageUpdatedAt: new Date(),
    },
    update: {
      companyName: intel.companyName,
      country: intel.country,
      score,
      recommendedOffering: offering.label,
      offeringCode: offering.code,
      whyNow: intel.whyNow,
      qualificationReason: reason,
      topDomain: intel.topDomain,
      jobCount,
      ...(preserveStage
        ? {}
        : { stage: autoStage, stageUpdatedAt: new Date() }),
    },
  });

  if (options?.refreshRanks !== false) {
    await refreshOpportunityRanks();
  }

  // Auto-generate pitch for qualified / nurture opportunities
  try {
    await enqueuePitchForOpportunity(opp.id);
  } catch (err) {
    logger.error({ err, opportunityId: opp.id }, 'Failed to enqueue pitch');
  }

  logger.info(
    { company: intel.companyName, stage: opp.stage, score },
    'Opportunity upserted from company intelligence',
  );

  return { id: opp.id, stage };
}

/** Recompute dense rank (1 = highest score) across all non-disqualified opportunities. */
export async function refreshOpportunityRanks(): Promise<number> {
  const rows = await prisma.opportunity.findMany({
    where: { stage: { not: 'DISQUALIFIED' } },
    orderBy: [{ score: 'desc' }, { jobCount: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  });

  await prisma.$transaction(
    rows.map((row, index) =>
      prisma.opportunity.update({
        where: { id: row.id },
        data: { rank: index + 1 },
      }),
    ),
  );

  // Disqualified get rank 0
  await prisma.opportunity.updateMany({
    where: { stage: 'DISQUALIFIED' },
    data: { rank: 0 },
  });

  return rows.length;
}

/** Sync all DONE company intelligence rows into opportunities. */
export async function syncOpportunitiesFromIntelligence(): Promise<{
  upserted: number;
  skipped: number;
}> {
  const done = await prisma.companyIntelligence.findMany({
    where: { aiStatus: 'DONE', opportunityScore: { not: null } },
    select: { id: true, opportunityScore: true },
  });

  let upserted = 0;
  let skipped = 0;

  for (const row of done) {
    const result = await upsertOpportunityFromCompany(row.id, { refreshRanks: false });
    if (result) upserted++;
    else skipped++;
  }

  await refreshOpportunityRanks();
  logger.info({ upserted, skipped }, 'Opportunity sync complete');
  return { upserted, skipped };
}

export async function updateOpportunityStage(
  id: string,
  stage: OpportunityStage,
  notes?: string,
) {
  return prisma.opportunity.update({
    where: { id },
    data: {
      stage,
      stageUpdatedAt: new Date(),
      ...(notes !== undefined ? { notes } : {}),
    },
  });
}
