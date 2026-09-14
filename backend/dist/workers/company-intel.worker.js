import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { recalculateCompany } from '../services/company-intel.service.js';
export function createCompanyIntelWorker() {
    const worker = new Worker('company-intel', async (job) => {
        const { companyId } = job.data;
        logger.info({ jobId: job.id, companyId }, 'Company-intel worker: recalculating');
        await recalculateCompany(companyId);
        logger.info({ jobId: job.id, companyId }, 'Company-intel worker: done');
    }, {
        connection: redisConnection,
        concurrency: env.COMPANY_INTEL_CONCURRENCY,
    });
    worker.on('failed', (job, err) => {
        logger.error({ err, jobId: job?.id }, 'Company-intel job failed');
    });
    worker.on('error', (err) => {
        logger.error({ err }, 'Company-intel worker error');
    });
    return worker;
}
//# sourceMappingURL=company-intel.worker.js.map