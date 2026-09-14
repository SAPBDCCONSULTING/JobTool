import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
export const outreachRouter = Router();
const OutreachPatch = z.object({
    body: z.string().max(8000).optional(),
    subject: z.string().max(300).optional(),
    status: z.enum(['draft', 'sent', 'done']).optional(),
});
outreachRouter.get('/', async (_req, res) => {
    const emails = await prisma.outreachEmail.findMany({
        orderBy: { createdAt: 'desc' },
        include: { company: { select: { id: true, name: true, country: true } } },
        take: 100,
    });
    res.json({ emails });
});
outreachRouter.patch('/:id', async (req, res) => {
    const parsed = OutreachPatch.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
        return;
    }
    const id = String(req.params.id);
    try {
        const email = await prisma.outreachEmail.update({
            where: { id },
            data: parsed.data,
            include: { company: { select: { id: true, name: true, country: true } } },
        });
        res.json({ email });
    }
    catch (err) {
        logger.error({ err }, 'Failed to update outreach email');
        res.status(500).json({ error: 'Failed to update outreach email' });
    }
});
outreachRouter.delete('/:id', async (req, res) => {
    const id = String(req.params.id);
    try {
        await prisma.outreachEmail.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        logger.error({ err }, 'Failed to delete outreach email');
        res.status(500).json({ error: 'Failed to delete outreach email' });
    }
});
//# sourceMappingURL=outreach.js.map