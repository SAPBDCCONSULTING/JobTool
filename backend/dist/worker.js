// Worker-only process entry point — run separately from the HTTP server.
// Usage: npm run dev:worker  (dev)  |  npm run start:worker  (prod)
// For a combined API + workers process, use main.ts instead.
import './config/env.js'; // Validate env vars before anything else
import { logger } from './lib/logger.js';
import { startWorkers } from './start-workers.js';
async function main() {
    logger.info('Starting background workers...');
    const { close } = await startWorkers();
    // ── Graceful shutdown ──────────────────────────────────────
    const shutdown = async (signal) => {
        logger.info({ signal }, 'Shutdown signal received, closing workers...');
        await close();
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
//# sourceMappingURL=worker.js.map