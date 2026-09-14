import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getSourceBaseMap, normalizeJobUrl } from '../services/url.service.js';
export const jobsRouter = Router();
jobsRouter.get('/', async (req, res) => {
    const { country, minRelevance, domain, companyName, aiStatus, source, lifecycleStatus, keyword, page = '1', limit = '20', } = req.query;
    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
    const skip = (pageNum - 1) * limitNum;
    // Build where clause
    const where = {};
    if (country) {
        where.country = { contains: String(country), mode: 'insensitive' };
    }
    if (minRelevance) {
        where.relevanceScore = { gte: parseInt(String(minRelevance), 10) };
    }
    if (domain) {
        where.domain = { contains: String(domain), mode: 'insensitive' };
    }
    if (companyName) {
        where.companyName = { contains: String(companyName), mode: 'insensitive' };
    }
    if (aiStatus) {
        where.aiStatus = String(aiStatus).toUpperCase();
    }
    if (lifecycleStatus) {
        where.lifecycleStatus = String(lifecycleStatus).toUpperCase();
    }
    if (keyword) {
        where.searchString = { contains: String(keyword), mode: 'insensitive' };
    }
    if (source) {
        where.rawJob = { is: { source: String(source) } };
    }
    const bases = await getSourceBaseMap();
    const [jobs, total] = await Promise.all([
        prisma.cleanJob.findMany({
            where,
            orderBy: [{ relevanceScore: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
            take: limitNum,
            skip,
            include: {
                rawJob: { select: { location: true, jobId: true, companyUrl: true, source: true, url: true } },
                rawOccurrences: {
                    where: { url: { not: null } },
                    select: { url: true, source: true },
                    take: 1,
                    orderBy: { createdAt: 'asc' },
                },
            },
        }),
        prisma.cleanJob.count({ where }),
    ]);
    // Best available link: canonical URL → first occurrence with a URL → legacy jobId URL.
    const resolveJobUrl = (j) => normalizeJobUrl(j.url, j.rawJob?.source, bases) ??
        normalizeJobUrl(j.rawOccurrences[0]?.url ?? null, j.rawOccurrences[0]?.source, bases) ??
        (j.rawJob?.jobId?.startsWith('http') ? j.rawJob.jobId : null);
    res.json({
        jobs: jobs.map((j) => ({
            id: j.id,
            jobTitle: j.jobTitle,
            companyName: j.companyName,
            country: j.country,
            location: j.rawJob?.location ?? null,
            jobUrl: resolveJobUrl(j),
            companyUrl: j.rawJob?.companyUrl ?? null,
            domain: j.domain,
            source: j.rawJob?.source ?? null,
            lifecycleStatus: j.lifecycleStatus,
            aiStatus: j.aiStatus,
            aiReason: j.aiReason,
            relevanceScore: j.relevanceScore,
            technologies: j.technologies,
            roleCategory: j.roleCategory,
            seniority: j.seniority,
            projectType: j.projectType,
            outsourcingPotential: j.outsourcingPotential,
            summary: j.summary,
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
/** Full job detail: description, complete AI analysis, occurrences (sources), links. */
jobsRouter.get('/:id', async (req, res) => {
    const id = String(req.params.id);
    const bases = await getSourceBaseMap();
    const job = await prisma.cleanJob.findUnique({
        where: { id },
        include: {
            rawJob: { select: { location: true, companyUrl: true, source: true, url: true } },
            rawOccurrences: {
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    source: true,
                    url: true,
                    location: true,
                    publishedAt: true,
                    createdAt: true,
                    searchString: true,
                },
            },
            company: { select: { id: true, name: true } },
        },
    });
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    // Best available application link (canonical → first occurrence with URL → legacy).
    const withUrl = job.rawOccurrences.find((o) => o.url);
    const jobUrl = normalizeJobUrl(job.url, job.rawJob?.source, bases) ??
        normalizeJobUrl(withUrl?.url ?? null, withUrl?.source, bases) ??
        (job.rawJob?.url?.startsWith('http') ? job.rawJob.url : null);
    res.json({
        job: {
            id: job.id,
            jobTitle: job.jobTitle,
            jobDescription: job.jobDescription,
            companyName: job.companyName,
            country: job.country,
            domain: job.domain,
            lifecycleStatus: job.lifecycleStatus,
            aiStatus: job.aiStatus,
            aiReason: job.aiReason,
            relevanceScore: job.relevanceScore,
            technologies: job.technologies,
            roleCategory: job.roleCategory,
            seniority: job.seniority,
            projectType: job.projectType,
            outsourcingPotential: job.outsourcingPotential,
            summary: job.summary,
            searchString: job.searchString,
            createdAt: job.createdAt,
            aiProcessedAt: job.aiProcessedAt,
            company: job.company,
            companyUrl: job.rawJob?.companyUrl ?? null,
            jobUrl,
            occurrences: job.rawOccurrences.map((o) => ({
                id: o.id,
                source: o.source,
                url: normalizeJobUrl(o.url, o.source, bases),
                location: o.location,
                publishedAt: o.publishedAt,
                seenAt: o.createdAt,
                keyword: o.searchString,
            })),
        },
    });
});
//# sourceMappingURL=jobs.js.map