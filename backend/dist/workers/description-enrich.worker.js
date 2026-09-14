import { Worker } from 'bullmq';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { Prisma } from '@prisma/client';
import { redisConnection } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { normalizeJobUrl, getSourceBaseMap } from '../services/url.service.js';
import { descEnrichQueue } from '../lib/queue.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRAPER_DIR = path.resolve(__dirname, '../../scraper');
/**
 * Enrich jobs whose descriptions are missing: fetch the job detail page with
 * Playwright (batched into one browser session), extract the description,
 * store it, and re-queue the job for AI analysis with the full text.
 */
export function createDescriptionEnrichWorker() {
    const worker = new Worker('desc-enrich', async (job) => {
        // Periodic self-refill: queue the next batch of pending enrichments
        if (job.name === 'enqueue-pending') {
            const queued = await enqueueDescriptionEnrichment();
            logger.info({ queued }, 'Enrichment self-refill check complete');
            return;
        }
        const { jobIds } = job.data;
        if (!jobIds?.length)
            return;
        const bases = await getSourceBaseMap();
        const jobs = await prisma.cleanJob.findMany({
            where: { id: { in: jobIds } },
            select: { id: true, url: true, companyId: true, rawJob: { select: { source: true } } },
        });
        if (jobs.length === 0)
            return;
        const urlByJob = new Map();
        const urlList = [];
        for (const j of jobs) {
            const url = normalizeJobUrl(j.url, j.rawJob?.source, bases);
            if (url) {
                urlByJob.set(url, j.id);
                urlList.push({ url, source: j.rawJob?.source ?? '' });
            }
        }
        if (urlList.length === 0) {
            await prisma.cleanJob.updateMany({
                where: { id: { in: jobs.map((j) => j.id) } },
                data: { descriptionFetched: true },
            });
            return;
        }
        // Write the URL list to a temp file for the Python script
        const tmpFile = path.join(os.tmpdir(), `enrich-${job.id}.json`);
        fs.writeFileSync(tmpFile, JSON.stringify(urlList));
        const pythonPath = path.resolve(SCRAPER_DIR, env.SCRAPER_PYTHON);
        const enrichPy = path.resolve(SCRAPER_DIR, 'enrich.py');
        const proc = spawn(pythonPath, [enrichPy, '--file', tmpFile], {
            cwd: SCRAPER_DIR,
            env: { ...process.env },
        });
        let stdout = '';
        proc.stdout.on('data', (d) => (stdout += d.toString()));
        proc.stderr.on('data', (d) => logger.debug({ msg: d.toString().trim() }, 'enrich.py'));
        const exitCode = await new Promise((resolve) => {
            proc.on('close', (code) => resolve(code ?? 1));
            proc.on('error', (err) => {
                logger.error({ err }, 'enrich.py spawn error');
                resolve(1);
            });
        });
        fs.unlinkSync(tmpFile);
        if (exitCode !== 0)
            throw new Error(`enrich.py exited with ${exitCode}`);
        const results = JSON.parse(stdout);
        const descByUrl = new Map(results.map((r) => [r.url, r]));
        let enriched = 0;
        let stillEmpty = 0;
        const companyIds = new Set();
        for (const j of jobs) {
            const url = normalizeJobUrl(j.url, j.rawJob?.source, bases);
            const description = (url ? descByUrl.get(url)?.description : '') ?? '';
            if (description.length > 200) {
                await prisma.cleanJob.update({
                    where: { id: j.id },
                    data: {
                        jobDescription: description.slice(0, 20000),
                        descriptionFetched: true,
                        aiStatus: 'PENDING', // re-run AI with the full text
                    },
                });
                if (j.companyId)
                    companyIds.add(j.companyId);
                enriched++;
            }
            else {
                await prisma.cleanJob.update({
                    where: { id: j.id },
                    data: { descriptionFetched: true },
                });
                stillEmpty++;
            }
        }
        // Flag affected companies for recalculation (scores used title-only data)
        if (companyIds.size > 0) {
            await prisma.company.updateMany({
                where: { id: { in: [...companyIds] } },
                data: { needsRecalc: true },
            });
        }
        logger.info({ jobId: job.id, total: jobs.length, enriched, stillEmpty }, 'Description enrichment batch complete');
        // Self-refill after each batch so the pipeline keeps draining while
        // there is eligible work (avoid waiting up to 30 min per 40 jobs).
        const remaining = await enqueueDescriptionEnrichment();
        if (remaining > 0) {
            logger.info({ remaining }, 'Enrichment self-refill queued');
        }
    }, {
        connection: redisConnection,
        concurrency: env.DESC_ENRICH_CONCURRENCY,
    });
    worker.on('failed', (job, err) => {
        logger.error({ err, jobId: job?.id }, 'Description enrichment job failed');
    });
    worker.on('error', (err) => {
        logger.error({ err }, 'Description enrichment worker error');
    });
    return worker;
}
/** Queue the next batch of jobs that need description enrichment. */
export async function enqueueDescriptionEnrichment(limit = 40) {
    const cutoff = new Date(Date.now() - env.JOB_STALE_DAYS * 24 * 60 * 60 * 1000);
    // Use char_length (true text length) — a Prisma `lt` on Text would be
    // lexicographic and wrongly include long LinkedIn descriptions.
    const rows = await prisma.$queryRaw(Prisma.sql `
    SELECT id FROM clean_jobs
    WHERE "descriptionFetched" = false
      AND url IS NOT NULL
      AND "lifecycleStatus" = 'ACTIVE'
      AND "aiStatus" = 'DONE'
      AND "relevanceScore" >= ${env.MIN_JOB_RELEVANCE}
      AND char_length(COALESCE("jobDescription", '')) < 200
      AND "lastSeenAt" >= ${cutoff}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `);
    if (rows.length === 0)
        return 0;
    let queued = 0;
    for (let i = 0; i < rows.length; i += env.DESC_ENRICH_BATCH) {
        const batch = rows.slice(i, i + env.DESC_ENRICH_BATCH).map((r) => r.id);
        await descEnrichQueue.add('enrich-batch', { jobIds: batch }, { jobId: `enrich-${Date.now()}-${i}` });
        queued += batch.length;
    }
    logger.info({ queued }, 'Description enrichment queued');
    return queued;
}
/**
 * Register the repeatable "re-enqueue pending enrichments" job.
 * Runs every 30 minutes so jobs missing descriptions keep draining even if
 * new data arrives after the initial startup enqueue. Idempotent via jobId.
 */
export async function registerEnrichRepeatable() {
    await descEnrichQueue.add('enqueue-pending', {}, {
        repeat: { pattern: '*/30 * * * *' },
        jobId: 'enqueue-pending',
        removeOnComplete: true,
        removeOnFail: true,
    });
    logger.info('Description-enrich repeatable registered (every 30 min)');
}
//# sourceMappingURL=description-enrich.worker.js.map