// Worker process entry point — run separately from the HTTP server
// Usage: npm run dev:worker  (dev)  |  npm run start:worker  (prod)
import './config/env.js'; // Validate env vars before anything else
import { logger } from './lib/logger.js';
import { createIngestionWorker } from './workers/ingestion.worker.js';
import { createAiClassifyWorker } from './workers/ai-classify.worker.js';
import { createAiCompanyWorker } from './workers/ai-company.worker.js';
import { createAiPitchWorker } from './workers/ai-pitch.worker.js';
import { createEuropeScrapeWorker } from './workers/europe-scrape.worker.js';
import {
  createSchedulerWorker,
  registerDailySchedule,
} from './workers/scheduler.worker.js';

async function main() {
  logger.info('Starting background workers...');

  const ingestionWorker = createIngestionWorker();
  const aiWorker = createAiClassifyWorker();
  const companyAiWorker = createAiCompanyWorker();
  const pitchAiWorker = createAiPitchWorker();
  const europeScrapeWorker = createEuropeScrapeWorker();
  const schedulerWorker = createSchedulerWorker();

  await registerDailySchedule();

  logger.info('✅ Ingestion worker started (queue: ingestion)');
  logger.info('✅ AI classify worker started (queue: ai-classify)');
  logger.info('✅ Company AI worker started (queue: ai-company)');
  logger.info('✅ Pitch AI worker started (queue: ai-pitch)');
  logger.info('✅ Europe scrape worker started (queue: europe-scrape)');
  logger.info('✅ Scheduler worker started (queue: scheduler)');

  // ── Graceful shutdown ──────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received, closing workers...');
    await Promise.all([
      ingestionWorker.close(),
      aiWorker.close(),
      companyAiWorker.close(),
      pitchAiWorker.close(),
      europeScrapeWorker.close(),
      schedulerWorker.close(),
    ]);
    logger.info('Workers stopped. Bye!');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start workers');
  process.exit(1);
});
