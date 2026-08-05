// Worker process entry point — run separately from the HTTP server
// Usage: npm run dev:worker  (dev)  |  npm run start:worker  (prod)
import './config/env.js'; // Validate env vars before anything else
import { logger } from './lib/logger.js';
import { createIngestionWorker } from './workers/ingestion.worker.js';
import { createAiClassifyWorker } from './workers/ai-classify.worker.js';

async function main() {
  logger.info('Starting background workers...');

  const ingestionWorker = createIngestionWorker();
  const aiWorker = createAiClassifyWorker();

  logger.info('✅ Ingestion worker started (queue: ingestion)');
  logger.info('✅ AI classify worker started (queue: ai-classify)');

  // ── Graceful shutdown ──────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received, closing workers...');
    await Promise.all([ingestionWorker.close(), aiWorker.close()]);
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
