import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { findOrCreateKeyword, findOrCreateSource, createRunForPair } from '../services/scheduler.service.js';

export const searchRouter = Router();

const SearchBody = z.object({
  keyword: z.string().trim().min(1).max(80),
  location: z.string().trim().max(120).optional(),
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

  const { keyword: term, location } = parsed.data;

  try {
    const keyword = await findOrCreateKeyword(term, { location: location ?? null });
    const source = await findOrCreateSource({
      name: 'linkedin-apify',
      type: 'APIFY',
    });

    const run = await createRunForPair(keyword, source, 'manual');

    logger.info({ keyword: term, location, runId: run?.runId }, 'Search job queued');

    res.json({
      status: 'queued',
      message: `Search for "${term}"${location ? ` in "${location}"` : ''} is queued. Results will appear in the Jobs tab within a few minutes.`,
      keyword: term,
      location: location ?? '',
      runId: run?.runId ?? null,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to queue search');
    res.status(500).json({ error: 'Failed to queue search' });
  }
});
