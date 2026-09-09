import { Router } from 'express';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import {
  buildEuropeTargets,
  buildLinkedInTargets,
  WORKING_EUROPE_SITES,
} from '../config/scrape-schedule.js';
import { schedulerQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';

export const schedulerRouter = Router();

schedulerRouter.get('/', async (_req: Request, res: Response) => {
  const repeatables = await schedulerQueue.getRepeatableJobs();
  const linkedIn = buildLinkedInTargets(
    env.SCHEDULER_KEYWORD,
    env.SCHEDULER_LINKEDIN_LOCATIONS,
  );

  res.json({
    enabled: env.SCHEDULER_ENABLED,
    intervalMs: env.SCHEDULER_INTERVAL_MS,
    intervalHours: Math.round((env.SCHEDULER_INTERVAL_MS / (60 * 60 * 1000)) * 10) / 10,
    keyword: env.SCHEDULER_KEYWORD,
    linkedInTargets: linkedIn,
    europeSiteCount: WORKING_EUROPE_SITES.length,
    europeStaggerMs: env.SCHEDULER_EUROPE_STAGGER_MS,
    repeatables: repeatables.map((j) => ({
      id: j.id,
      name: j.name,
      every: j.every,
      next: j.next,
      key: j.key,
    })),
  });
});

/** Manually trigger one full daily-scan cycle (does not change the 24h schedule). */
schedulerRouter.post('/run', async (_req: Request, res: Response) => {
  await schedulerQueue.add(
    'daily-scan',
    { source: 'manual' },
    { jobId: `manual-scan-${Date.now()}` },
  );
  logger.info('Manual daily-scan queued');
  res.json({
    status: 'queued',
    message:
      'Full scan cycle queued. LinkedIn locations and working Europe sites will run staggered.',
  });
});
