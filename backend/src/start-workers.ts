import { logger } from './lib/logger.js';
import { ensureSources } from './services/scheduler.service.js';
import { createSourceFetchWorker } from './workers/source-fetch.worker.js';
import { createCountryScrapeWorker } from './workers/country-scrape.worker.js';
import { createAiClassifyWorker } from './workers/ai-classify.worker.js';
import { createSchedulerWorker, registerSchedulerRepeatable } from './workers/scheduler.worker.js';
import { createCompanyIntelWorker } from './workers/company-intel.worker.js';
import { createLifecycleWorker, registerLifecycleRepeatable } from './workers/lifecycle.worker.js';
import { createDescriptionEnrichWorker, enqueueDescriptionEnrichment, registerEnrichRepeatable } from './workers/description-enrich.worker.js';

export interface RunningWorkers {
  close: () => Promise<void>;
}

/**
 * Start all background workers + register the repeatable schedules.
 * Shared by the standalone worker entry (worker.ts) and the combined
 * API + workers entry (main.ts).
 */
export async function startWorkers(): Promise<RunningWorkers> {
  // Seed source catalog (LinkedIn + European sites) before scheduling.
  await ensureSources();
  await registerSchedulerRepeatable();
  await registerLifecycleRepeatable();
  await registerEnrichRepeatable();

  const sourceFetchWorker = createSourceFetchWorker();
  const countryScrapeWorker = createCountryScrapeWorker();
  const aiWorker = createAiClassifyWorker();
  const schedulerWorker = createSchedulerWorker();
  const companyIntelWorker = createCompanyIntelWorker();
  const lifecycleWorker = createLifecycleWorker();
  const descEnrichWorker = createDescriptionEnrichWorker();

  logger.info('✅ source-fetch worker started (queue: source-fetch)');
  logger.info('✅ country-scrape worker started (queue: country-scrape)');
  logger.info('✅ ai-classify worker started (queue: ai-classify)');
  logger.info('✅ scheduler worker started (queue: scheduler)');
  logger.info('✅ company-intel worker started (queue: company-intel)');
  logger.info('✅ lifecycle worker started (queue: lifecycle)');
  logger.info('✅ description-enrich worker started (queue: desc-enrich)');

  // Kick off description enrichment for eligible jobs shortly after startup
  setTimeout(() => {
    enqueueDescriptionEnrichment().catch((err) =>
      logger.error({ err }, 'Failed to queue description enrichment'),
    );
  }, 30_000);

  const close = async () => {
    await Promise.all([
      sourceFetchWorker.close(),
      countryScrapeWorker.close(),
      aiWorker.close(),
      schedulerWorker.close(),
      companyIntelWorker.close(),
      lifecycleWorker.close(),
      descEnrichWorker.close(),
    ]);
  };

  return { close };
}
