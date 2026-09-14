import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { fetchAndProcessApify } from '../services/ingest.service.js';
export function createSourceFetchWorker() {
    const worker = new Worker('source-fetch', async (job) => {
        const { runId } = job.data;
        logger.info({ jobId: job.id, runId }, 'Source-fetch worker: processing job');
        await fetchAndProcessApify(runId);
        logger.info({ jobId: job.id, runId }, 'Source-fetch worker: job complete');
    }, {
        connection: redisConnection,
        concurrency: env.SOURCE_FETCH_CONCURRENCY, // keep low — Apify rate limits
    });
    worker.on('failed', (job, err) => {
        logger.error({ err, jobId: job?.id }, 'Source-fetch job failed');
    });
    worker.on('error', (err) => {
        logger.error({ err }, 'Source-fetch worker error');
    });
    return worker;
}
//# sourceMappingURL=source-fetch.worker.js.map