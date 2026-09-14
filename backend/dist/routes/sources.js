import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { ensureSources } from '../services/scheduler.service.js';
export const sourcesRouter = Router();
const SourceUpdate = z.object({
    enabled: z.boolean(),
});
function hostFromWebsite(website) {
    try {
        return new URL(website).hostname.replace(/^www\./, '');
    }
    catch {
        return website.replace(/^www\./, '');
    }
}
sourcesRouter.get('/', async (_req, res) => {
    const sources = await prisma.source.findMany({
        orderBy: [{ type: 'asc' }, { country: 'asc' }],
        include: {
            runs: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    status: true,
                    runType: true,
                    itemsFetched: true,
                    itemsNew: true,
                    itemsDup: true,
                    itemsFiltered: true,
                    itemsFailed: true,
                    error: true,
                    startedAt: true,
                    finishedAt: true,
                },
            },
        },
    });
    res.json({ sources });
});
/** Re-seed the source catalog (LinkedIn + known European sites). */
sourcesRouter.post('/sync', async (_req, res) => {
    const count = await ensureSources();
    res.json({ ok: true, count });
});
sourcesRouter.patch('/:name', async (req, res) => {
    const parsed = SourceUpdate.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed' });
        return;
    }
    const name = String(req.params.name);
    try {
        const source = await prisma.source.update({
            where: { name },
            data: { enabled: parsed.data.enabled },
        });
        res.json({ source });
    }
    catch (err) {
        logger.error({ err }, 'Failed to update source');
        res.status(500).json({ error: 'Failed to update source' });
    }
});
/** Manual scrape of one website (used by the Sources/Jobs UI). */
sourcesRouter.post('/:name/scrape', async (req, res) => {
    const body = z
        .object({ keyword: z.string().trim().min(1).max(80) })
        .safeParse(req.body);
    if (!body.success) {
        res.status(400).json({ error: 'keyword is required' });
        return;
    }
    const name = String(req.params.name);
    try {
        const source = await prisma.source.findUnique({ where: { name } });
        if (!source) {
            res.status(404).json({ error: 'Source not found' });
            return;
        }
        // Manual scrapes are allowed even for disabled sources.
        const keyword = await prisma.keyword.upsert({
            where: { term: body.data.keyword },
            update: {},
            create: {
                term: body.data.keyword,
                category: 'ad-hoc',
                enabled: true,
                scheduleHours: 6,
            },
        });
        const run = await prisma.sourceRun.create({
            data: {
                sourceId: source.id,
                keywordId: keyword.id,
                runType: 'manual',
                status: 'QUEUED',
            },
        });
        const { countryScrapeQueue, sourceFetchQueue } = await import('../lib/queue.js');
        if (source.type === 'APIFY') {
            await sourceFetchQueue.add('fetch', { runId: run.id }, { jobId: `fetch-${run.id}` });
        }
        else {
            await countryScrapeQueue.add('scrape', { runId: run.id }, { jobId: `scrape-${run.id}` });
        }
        res.json({ ok: true, status: 'queued', runId: run.id, message: `Scraping "${body.data.keyword}" from ${source.name}` });
    }
    catch (err) {
        logger.error({ err }, 'Failed to queue manual scrape');
        res.status(500).json({ error: 'Failed to queue scrape' });
    }
});
//# sourceMappingURL=sources.js.map