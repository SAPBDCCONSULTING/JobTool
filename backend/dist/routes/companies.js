import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { companyIntelQueue } from '../lib/queue.js';
import { generateOutreach, OUTREACH_MODEL, OUTREACH_PROMPT_VERSION } from '../services/outreach.service.js';
export const companiesRouter = Router();
/**
 * Companies ranked by opportunity score (company-first dashboard).
 * Falls back to average job relevance ordering for companies not yet recalculated.
 */
companiesRouter.get('/', async (req, res) => {
    const minScore = req.query.minScore ? parseFloat(String(req.query.minScore)) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const rows = await prisma.$queryRaw(Prisma.sql `
    SELECT
      c.id,
      c.name AS "companyName",
      c.country,
      COUNT(j.id)::int AS "jobCount",
      ROUND(AVG(j."relevanceScore")::numeric, 1)::float AS "avgRelevance",
      ci.score,
      ci."activeJobs",
      ci."jobs7d",
      ci."jobs30d",
      ci."likelyInitiative",
      ci."recommendedServices",
      ci."topTechnologies",
      ci."scoreExplanation",
      ci."recalculatedAt",
      (
        SELECT domain FROM clean_jobs inner_cj
        WHERE inner_cj."companyId" = c.id AND domain IS NOT NULL
        GROUP BY domain ORDER BY COUNT(*) DESC LIMIT 1
      ) AS "topDomain"
    FROM companies c
    JOIN clean_jobs j
      ON j."companyId" = c.id AND j."aiStatus" = 'DONE' AND j."lifecycleStatus" = 'ACTIVE'
    LEFT JOIN company_intelligence ci ON ci."companyId" = c.id
    ${search ? Prisma.sql `WHERE c.name ILIKE ${'%' + search + '%'}` : Prisma.sql ``}
    GROUP BY c.id, ci.id
    ${minScore != null ? Prisma.sql `HAVING COALESCE(ci.score, 0) >= ${minScore}` : Prisma.sql ``}
    ORDER BY ci.score DESC NULLS LAST, AVG(j."relevanceScore") DESC NULLS LAST
    LIMIT 200
  `);
    res.json({
        companies: rows.map((c) => ({
            id: c.id,
            companyName: c.companyName,
            country: c.country,
            jobCount: Number(c.jobCount),
            activeJobs: c.activeJobs,
            jobs7d: c.jobs7d,
            jobs30d: c.jobs30d,
            avgRelevance: c.avgRelevance,
            topDomain: c.topDomain,
            score: c.score,
            likelyInitiative: c.likelyInitiative,
            recommendedServices: c.recommendedServices ?? [],
            topTechnologies: c.topTechnologies ?? [],
            scoreExplanation: c.scoreExplanation,
            recalculatedAt: c.recalculatedAt,
        })),
    });
});
/** Company detail: score + why + intelligence + active jobs. */
companiesRouter.get('/:id', async (req, res) => {
    const id = String(req.params.id);
    const company = await prisma.company.findUnique({
        where: { id },
        include: { intelligence: true },
    });
    if (!company) {
        res.status(404).json({ error: 'Company not found' });
        return;
    }
    const jobs = await prisma.cleanJob.findMany({
        where: { companyId: id, lifecycleStatus: 'ACTIVE', aiStatus: 'DONE' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
            id: true,
            jobTitle: true,
            country: true,
            domain: true,
            url: true,
            relevanceScore: true,
            technologies: true,
            roleCategory: true,
            seniority: true,
            projectType: true,
            outsourcingPotential: true,
            summary: true,
            createdAt: true,
        },
    });
    const occurrences = await prisma.rawJob.groupBy({
        by: ['canonicalJobId'],
        where: { canonicalJobId: { in: jobs.map((j) => j.id) } },
        _count: { id: true },
    });
    const occurrenceCounts = new Map(occurrences.filter((o) => o.canonicalJobId).map((o) => [o.canonicalJobId, o._count.id]));
    res.json({
        company: {
            id: company.id,
            name: company.name,
            country: company.country,
            aliases: company.aliases,
            needsRecalc: company.needsRecalc,
        },
        intelligence: company.intelligence,
        jobs: jobs.map((j) => ({ ...j, occurrences: occurrenceCounts.get(j.id) ?? 1 })),
    });
});
/** Manual recalculation trigger (bypasses the debounce window). */
companiesRouter.post('/:id/recalculate', async (req, res) => {
    const id = String(req.params.id);
    try {
        const company = await prisma.company.findUnique({ where: { id } });
        if (!company) {
            res.status(404).json({ error: 'Company not found' });
            return;
        }
        await prisma.company.update({ where: { id }, data: { needsRecalc: true } });
        await companyIntelQueue.add('recalc', { companyId: id }, { jobId: `company-intel-force-${id}-${Date.now()}` });
        logger.info({ companyId: id }, 'Manual company recalculation queued');
        res.json({ ok: true, message: `Recalculation queued for ${company.name}` });
    }
    catch (err) {
        logger.error({ err }, 'Failed to queue recalculation');
        res.status(500).json({ error: 'Failed to queue recalculation' });
    }
});
/** AI outreach draft generation from a company's intelligence. */
companiesRouter.post('/:id/outreach', async (req, res) => {
    const id = String(req.params.id);
    const company = await prisma.company.findUnique({
        where: { id },
        include: { intelligence: true },
    });
    if (!company) {
        res.status(404).json({ error: 'Company not found' });
        return;
    }
    const intel = company.intelligence;
    try {
        const draft = await generateOutreach({
            companyName: company.name,
            country: company.country,
            likelyInitiative: intel?.likelyInitiative ?? null,
            recommendedServices: intel?.recommendedServices ?? [],
            evidence: intel?.evidence ?? [],
            activeJobs: intel?.activeJobs ?? null,
            topTechnologies: intel?.topTechnologies ?? [],
        });
        const email = await prisma.outreachEmail.create({
            data: {
                companyId: company.id,
                subject: draft.subject,
                body: draft.body,
                status: 'draft',
                model: OUTREACH_MODEL,
                promptVersion: OUTREACH_PROMPT_VERSION,
            },
            include: { company: { select: { id: true, name: true, country: true } } },
        });
        logger.info({ companyId: company.id, emailId: email.id }, 'Outreach email generated');
        res.status(201).json({ email });
    }
    catch (err) {
        logger.error({ err, companyId: company.id }, 'Failed to generate outreach email');
        res.status(500).json({ error: 'Failed to generate outreach email' });
    }
});
//# sourceMappingURL=companies.js.map