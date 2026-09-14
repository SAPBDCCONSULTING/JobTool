import './config/env.js'; // Validate env vars first
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { ensureSources } from './services/scheduler.service.js';

// ── API-only entry point (npm run dev | npm run start) ──────────────
// For a combined API + workers process, use main.ts instead.

const app = createApp();

// Seed the source catalog in the background (idempotent).
ensureSources().catch((err) => {
  logger.error({ err }, 'Failed to ensure sources at startup');
});

app.listen(env.PORT, () => {
  logger.info(`🚀 API server running on http://localhost:${env.PORT}`);
  logger.info(`   Environment: ${env.NODE_ENV}`);
});

