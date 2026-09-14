import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { findOrCreateKeyword, triggerManualRuns } from '../services/scheduler.service.js';
export const keywordsRouter = Router();
const KeywordBody = z.object({
    term: z.string().trim().min(1).max(80),
    category: z.string().trim().max(40).optional(),
    location: z.string().trim().max(120).nullable().optional(),
    enabled: z.boolean().optional(),
    scheduleHours: z.coerce.number().int().min(1).max(168).optional(),
});
const KeywordUpdate = z.object({
    category: z.string().trim().max(40).optional(),
    location: z.string().trim().max(120).nullable().optional(),
    enabled: z.boolean().optional(),
    scheduleHours: z.coerce.number().int().min(1).max(168).optional(),
});
keywordsRouter.get('/', async (_req, res) => {
    const keywords = await prisma.keyword.findMany({
        orderBy: [{ enabled: 'desc' }, { term: 'asc' }],
        include: {
            runs: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    status: true,
                    itemsFetched: true,
                    itemsNew: true,
                    itemsDup: true,
                    itemsFiltered: true,
                    itemsFailed: true,
                    error: true,
                    finishedAt: true,
                },
            },
        },
    });
    res.json({ keywords });
});
keywordsRouter.post('/', async (req, res) => {
    const parsed = KeywordBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
        return;
    }
    try {
        const keyword = await findOrCreateKeyword(parsed.data.term, {
            category: parsed.data.category,
            location: parsed.data.location ?? null,
        });
        res.status(201).json({ keyword });
    }
    catch (err) {
        logger.error({ err }, 'Failed to create keyword');
        res.status(500).json({ error: 'Failed to create keyword' });
    }
});
keywordsRouter.patch('/:id', async (req, res) => {
    const parsed = KeywordUpdate.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
        return;
    }
    const id = String(req.params.id);
    try {
        const keyword = await prisma.keyword.update({
            where: { id },
            data: parsed.data,
        });
        res.json({ keyword });
    }
    catch (err) {
        logger.error({ err }, 'Failed to update keyword');
        res.status(500).json({ error: 'Failed to update keyword' });
    }
});
keywordsRouter.delete('/:id', async (req, res) => {
    const id = String(req.params.id);
    try {
        await prisma.keyword.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        logger.error({ err }, 'Failed to delete keyword');
        res.status(500).json({ error: 'Failed to delete keyword' });
    }
});
/** Manual trigger for a single keyword (all enabled sources). */
keywordsRouter.post('/:id/run', async (req, res) => {
    const id = String(req.params.id);
    try {
        const created = await triggerManualRuns(id);
        res.json({ ok: true, created });
    }
    catch (err) {
        logger.error({ err }, 'Failed to trigger keyword run');
        res.status(500).json({ error: 'Failed to trigger keyword run' });
    }
});
//# sourceMappingURL=keywords.js.map