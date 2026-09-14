import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
// ─────────────────────────────────────────────────────────────────────────────
// Metrics (deterministic, over ALL active analyzed canonical jobs)
// ─────────────────────────────────────────────────────────────────────────────
const NOTABLE_ROLE_RE = /\b(director|head|vp|vice president|chief|program manager|programme manager|transformation lead|migration lead|enterprise architect|solution architect|program lead|delivery lead|practice lead)\b/i;
export async function computeCompanyMetrics(companyId) {
    // Only jobs at or above the relevance floor count toward company
    // intelligence — prevents noise (e.g. keyword-substring false positives
    // like "SAC" matching a pastry shop in Sacavém) from polluting scores.
    const jobs = await prisma.cleanJob.findMany({
        where: {
            companyId,
            lifecycleStatus: 'ACTIVE',
            aiStatus: 'DONE',
            relevanceScore: { gte: env.MIN_JOB_RELEVANCE },
        },
        select: {
            jobTitle: true,
            createdAt: true,
            relevanceScore: true,
            technologies: true,
            roleCategory: true,
            outsourcingPotential: true,
        },
        orderBy: { createdAt: 'desc' },
    });
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const jobs7d = jobs.filter((j) => now - j.createdAt.getTime() <= 7 * day).length;
    const jobs30d = jobs.filter((j) => now - j.createdAt.getTime() <= 30 * day).length;
    // Technology distribution
    const techCounts = new Map();
    for (const j of jobs) {
        for (const t of j.technologies ?? []) {
            const key = t.trim();
            if (!key)
                continue;
            techCounts.set(key, (techCounts.get(key) ?? 0) + 1);
        }
    }
    const topTechnologies = [...techCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([t]) => t);
    const notableRoles = jobs
        .filter((j) => NOTABLE_ROLE_RE.test(j.jobTitle))
        .slice(0, 4)
        .map((j) => j.jobTitle)
        .slice(0, 4);
    const relevantScores = jobs.map((j) => j.relevanceScore).filter((s) => s != null);
    const outsourcing = jobs.map((j) => j.outsourcingPotential).filter((s) => s != null);
    return {
        activeJobs: jobs.length,
        jobs7d,
        jobs30d,
        topTechnologies,
        notableRoles,
        avgRelevance: relevantScores.length
            ? Math.round(relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length)
            : null,
        avgOutsourcing: outsourcing.length
            ? outsourcing.reduce((a, b) => a + b, 0) / outsourcing.length
            : null,
        functionalCount: jobs.filter((j) => (j.roleCategory ?? '') === 'functional').length,
        technicalCount: jobs.filter((j) => ['technical', 'data', 'cloud', 'techno-functional'].includes(j.roleCategory ?? '')).length,
        recentTitles: jobs.slice(0, 5).map((j) => j.jobTitle),
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// Opportunity score (deterministic, versioned, explainable)
// ─────────────────────────────────────────────────────────────────────────────
export const FORMULA_VERSION = 'opportunity-v1';
export function computeOpportunityScore(m) {
    const weights = {
        relevance: env.SCORE_WEIGHT_RELEVANCE,
        volume: env.SCORE_WEIGHT_VOLUME,
        velocity: env.SCORE_WEIGHT_VELOCITY,
        outsourcing: env.SCORE_WEIGHT_OUTSOURCING,
    };
    const relevance = m.avgRelevance ?? 0;
    const volume = Math.min(100, m.activeJobs * 25);
    const velocity = Math.min(100, m.jobs7d * 25 + m.jobs30d * 8);
    const outsourcing = Math.round((m.avgOutsourcing ?? 0) * 100);
    const breakdown = {
        relevance: { value: relevance, weight: weights.relevance },
        volume: { value: volume, weight: weights.volume },
        velocity: { value: velocity, weight: weights.velocity },
        outsourcing: { value: outsourcing, weight: weights.outsourcing },
    };
    const score = Math.round((relevance * weights.relevance +
        volume * weights.volume +
        velocity * weights.velocity +
        outsourcing * weights.outsourcing) /
        (weights.relevance + weights.volume + weights.velocity + weights.outsourcing));
    // Human-readable "why" evidence
    const explanation = [];
    explanation.push(`${m.activeJobs} active relevant role${m.activeJobs === 1 ? '' : 's'}`);
    if (m.jobs7d > 0)
        explanation.push(`${m.jobs7d} posted in the last 7 days`);
    if (m.jobs30d > 0)
        explanation.push(`${m.jobs30d} posted in the last 30 days`);
    if (m.topTechnologies.length > 0) {
        explanation.push(`Technologies hiring for: ${m.topTechnologies.join(', ')}`);
    }
    if (m.functionalCount > 0 && m.technicalCount > 0) {
        explanation.push(`Both functional (${m.functionalCount}) and technical (${m.technicalCount}) hiring`);
    }
    if (m.notableRoles.length > 0) {
        explanation.push(`Leadership/transformation roles detected: ${m.notableRoles.join('; ')}`);
    }
    if (m.avgOutsourcing != null) {
        explanation.push(`Average outsourcing potential: ${Math.round(m.avgOutsourcing * 100)}%`);
    }
    return { score, breakdown, explanation };
}
// ─────────────────────────────────────────────────────────────────────────────
// Company AI (receives aggregated metrics — never raw descriptions)
// ─────────────────────────────────────────────────────────────────────────────
const CompanyIntelSchema = z.object({
    likely_initiative: z.string(),
    recommended_services: z.array(z.string()).max(5),
    evidence: z.array(z.string()).max(6),
    summary: z.string(),
});
export const COMPANY_PROMPT_VERSION = 'company-intel-v2';
export const COMPANY_MODEL = 'gpt-4o-mini';
const companyAgent = new Agent({
    name: 'CompanyOpportunityAnalyst',
    model: COMPANY_MODEL,
    instructions: `You are a senior sales-strategy analyst for an SAP/ERP/Cloud/Data consulting firm.

You receive AGGREGATED hiring metrics for one company (never raw job descriptions). Infer what the hiring pattern means commercially and what services to pitch.

Respond with ONLY a valid JSON object:
{
  "likely_initiative": "<short phrase, e.g. 'S/4HANA migration program', 'SAP capability expansion', 'cloud data platform build'>",
  "recommended_services": ["<service to pitch>", ...],
  "evidence": ["<short factual observation supporting the assessment>", ...],
  "summary": "<2-3 sentence opportunity assessment for a sales rep>"
}

Rules:
- recommended_services: max 4, concrete consulting services matching the hiring signals.
- evidence: max 5 items, each referencing the metrics (counts, technologies, role types).
- Base everything on the provided metrics. Do not invent facts.`,
    outputType: CompanyIntelSchema,
});
async function runCompanyAI(companyName, metrics) {
    const input = `Company: ${companyName}

Hiring metrics (all active relevant roles):
- Active relevant jobs: ${metrics.activeJobs}
- Posted last 7 days: ${metrics.jobs7d}
- Posted last 30 days: ${metrics.jobs30d}
- Top technologies: ${metrics.topTechnologies.join(', ') || 'none detected'}
- Functional roles: ${metrics.functionalCount}, Technical/data/cloud roles: ${metrics.technicalCount}
- Average job relevance: ${metrics.avgRelevance ?? 'n/a'}/100
- Average outsourcing potential: ${metrics.avgOutsourcing != null ? Math.round(metrics.avgOutsourcing * 100) + '%' : 'n/a'}
- Notable leadership/transformation roles: ${metrics.notableRoles.join('; ') || 'none'}
- Recent role titles: ${metrics.recentTitles.join(' | ') || 'none'}`;
    const result = await run(companyAgent, input);
    if (!result.finalOutput)
        throw new Error('Company AI returned no output');
    if (typeof result.finalOutput === 'object') {
        return CompanyIntelSchema.parse(result.finalOutput);
    }
    const raw = String(result.finalOutput).trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
        throw new Error(`Could not extract JSON from company AI response: ${raw.slice(0, 200)}`);
    return CompanyIntelSchema.parse(JSON.parse(jsonMatch[0]));
}
// ─────────────────────────────────────────────────────────────────────────────
// Recalculation orchestration
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Full company recalculation: metrics → opportunity score → company AI → upsert.
 * Safe to call for companies with zero analyzed jobs (stores zero-state).
 */
export async function recalculateCompany(companyId) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
        logger.warn({ companyId }, 'Company recalculation skipped: company not found');
        return;
    }
    const metrics = await computeCompanyMetrics(companyId);
    if (!metrics)
        return;
    const { score, breakdown, explanation } = computeOpportunityScore(metrics);
    // Only spend a company-AI call when there is something to analyze.
    let intel = null;
    if (metrics.activeJobs > 0) {
        try {
            intel = await runCompanyAI(company.name, metrics);
        }
        catch (err) {
            logger.warn({ err, companyId }, 'Company AI failed; storing metrics + score only');
        }
    }
    const sharedData = {
        activeJobs: metrics.activeJobs,
        jobs7d: metrics.jobs7d,
        jobs30d: metrics.jobs30d,
        topTechnologies: metrics.topTechnologies,
        notableRoles: metrics.notableRoles,
        avgRelevance: metrics.avgRelevance,
        avgOutsourcing: metrics.avgOutsourcing,
        likelyInitiative: intel?.likely_initiative ?? null,
        recommendedServices: intel?.recommended_services ?? [],
        evidence: intel?.evidence ?? [],
        summary: intel?.summary ?? null,
        score,
        scoreBreakdown: breakdown,
        scoreExplanation: explanation.join(' • '),
        formulaVersion: FORMULA_VERSION,
        model: intel ? COMPANY_MODEL : null,
        recalculatedAt: new Date(),
    };
    await prisma.companyIntelligence.upsert({
        where: { companyId },
        update: sharedData,
        create: { companyId, ...sharedData },
    });
    await prisma.company.update({
        where: { id: companyId },
        data: { needsRecalc: false },
    });
    logger.info({ companyId, company: company.name, score, activeJobs: metrics.activeJobs, ai: !!intel }, 'Company recalculated');
}
//# sourceMappingURL=company-intel.service.js.map