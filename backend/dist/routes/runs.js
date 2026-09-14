import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { triggerManualRuns, retryRun } from '../services/scheduler.service.js';
import { aiQueue } from '../lib/queue.js';
import { JOB_PROMPT_VERSION } from '../services/ai-classifier.service.js';
export const runsRouter = Router();
runsRouter.get('/', async (req, res) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '25'))));
    const { status, sourceId, keywordId } = req.query;
    const where = {};
    if (status)
        where.status = String(status).toUpperCase();
    if (sourceId)
        where.sourceId = String(sourceId);
    if (keywordId)
        where.keywordId = String(keywordId);
    const [runs, total] = await Promise.all([
        prisma.sourceRun.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: (page - 1) * limit,
            include: {
                source: { select: { name: true, type: true, country: true, website: true } },
                keyword: { select: { id: true, term: true } },
            },
        }),
        prisma.sourceRun.count({ where }),
    ]);
    res.json({
        runs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    });
});
runsRouter.get('/:id', async (req, res) => {
    const id = String(req.params.id);
    const run = await prisma.sourceRun.findUnique({
        where: { id },
        include: {
            source: { select: { name: true, type: true, country: true, website: true } },
            keyword: { select: { id: true, term: true } },
        },
    });
    if (!run) {
        res.status(404).json({ error: 'Run not found' });
        return;
    }
    res.json({ run });
});
/** Manual "run everything" trigger (all enabled keywords × enabled sources). */
runsRouter.post('/trigger', async (_req, res) => {
    try {
        const created = await triggerManualRuns();
        res.json({ ok: true, created });
    }
    catch (err) {
        logger.error({ err }, 'Failed to trigger runs');
        res.status(500).json({ error: 'Failed to trigger runs' });
    }
});
runsRouter.post('/:id/retry', async (req, res) => {
    const id = String(req.params.id);
    try {
        await retryRun(id);
        res.json({ ok: true });
    }
    catch (err) {
        logger.error({ err }, 'Failed to retry run');
        res.status(500).json({ error: 'Failed to retry run' });
    }
});
/**
 * Reprocessing (PRD §37): re-run AI analysis on canonical jobs whose stored
 * analysis predates the current prompt version. The AI worker picks the
 * reset rows up automatically; companies are re-marked for recalculation.
 */
runsRouter.post('/reprocess', async (req, res) => {
    // Re-analyze everything whose stored analysis predates the current prompt version
    // (covers legacy rows with promptVersion = NULL and older versions alike).
    const where = {
        aiStatus: 'DONE',
        OR: [{ promptVersion: null }, { promptVersion: { not: JOB_PROMPT_VERSION } }],
    };
    const stale = await prisma.cleanJob.findMany({ where, select: { id: true } });
    if (stale.length === 0) {
        res.json({ ok: true, reset: 0, message: 'All analyses are up to date' });
        return;
    }
    // Legacy rows may lack a companyId — backfill from the origin raw record's company.
    await prisma.$executeRaw `
    UPDATE clean_jobs j
    SET "companyId" = comp.id
    FROM raw_jobs r, companies comp
    WHERE j."rawJobId" = r.id
      AND j."companyId" IS NULL
      AND comp."normalizedName" = r."companyName"
  `;
    await prisma.cleanJob.updateMany({
        where: { id: { in: stale.map((s) => s.id) } },
        data: { aiStatus: 'PENDING', promptVersion: null },
    });
    await aiQueue.add('process-batch', { triggeredBy: 'reprocess', resetJobs: stale.length }, { jobId: `ai-reprocess-${Date.now()}` });
    logger.info({ reset: stale.length }, 'Reprocessing queued');
    res.json({ ok: true, reset: stale.length, message: `Re-processing ${stale.length} jobs with the latest analysis version` });
});
/** Enqueue description enrichment for eligible jobs (title-only → full text). */
runsRouter.post('/enrich-descriptions', async (_req, res) => {
    try {
        const { enqueueDescriptionEnrichment } = await import('../workers/description-enrich.worker.js');
        const queued = await enqueueDescriptionEnrichment(60);
        res.json({
            ok: true,
            queued,
            message: queued > 0 ? `Enrichment queued for ${queued} jobs` : 'No jobs need enrichment',
        });
    }
    catch (err) {
        logger.error({ err }, 'Failed to queue description enrichment');
        res.status(500).json({ error: 'Failed to queue description enrichment' });
    }
});
//# sourceMappingURL=runs.js.map