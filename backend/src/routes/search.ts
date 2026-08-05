import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ingestionQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';

export const searchRouter = Router();

const SearchBody = z.object({
  keyword: z.string().min(1).max(100).trim(),
  location: z.string().min(1).max(100).trim(),
});

searchRouter.post('/', async (req: Request, res: Response) => {
  const parsed = SearchBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { keyword, location } = parsed.data;

  await ingestionQueue.add(
    'ingest',
    { keyword, location },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
  );

  logger.info({ keyword, location }, 'Search job queued');

  res.json({
    status: 'queued',
    message: `Search for "${keyword}" in "${location}" is queued. Results will appear in the Jobs tab within a few minutes.`,
    keyword,
    location,
  });
});
