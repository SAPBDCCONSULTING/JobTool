// Combined entry point — runs the HTTP API AND all background workers in one process.
// Usage: npm run dev:all  (dev)  |  npm run start:all  (prod)
import './config/env.js'; // Validate env vars before anything else
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { startWorkers } from './start-workers.js';
async function main() {
    logger.info('Starting combined API + workers...');
    // 1. Start all 7 BullMQ workers + repeatable schedules
    const { close: closeWorkers } = await startWorkers();
    // 2. Start the HTTP server
    const app = createApp();
    const server = app.listen(env.PORT, () => {
        logger.info(`🚀 API server running on http://localhost:${env.PORT}`);
        logger.info(`   Environment: ${env.NODE_ENV}`);
    });
    // ── Graceful shutdown (close HTTP server + workers together) ──
    const shutdown = async (signal) => {
        logger.info({ signal }, 'Shutdown signal received, closing server + workers...');
        await new Promise((resolve) => server.close(() => resolve()));
        await closeWorkers();
        logger.info('API + workers stopped. Bye!');
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
main().catch((err) => {
    logger.error({ err }, 'Failed to start combined API + workers');
    process.exit(1);
});
//# sourceMappingURL=main.js.map