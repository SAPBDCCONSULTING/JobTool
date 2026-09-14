import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './routes/index.js';
/**
 * Build the Express app. Kept separate from the process entry points so the
 * same app can run standalone (index.ts) or combined with the workers (main.ts).
 */
export function createApp() {
    const app = express();
    // ── Middleware ─────────────────────────────────────────────────
    app.use(cors({
        origin: '*', // Tighten in production to your frontend domain
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(express.json({ limit: '1mb' }));
    // ── Routes ─────────────────────────────────────────────────────
    app.use('/api', apiRouter);
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV });
    });
    // 404 handler
    app.use((_req, res) => {
        res.status(404).json({ error: 'Not found' });
    });
    // Global error handler
    app.use((err, _req, res, _next) => {
        logger.error({ err }, 'Unhandled error');
        res.status(500).json({ error: 'Internal server error' });
    });
    return app;
}
//# sourceMappingURL=app.js.map