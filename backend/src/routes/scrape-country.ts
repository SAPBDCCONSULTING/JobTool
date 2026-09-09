import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '../lib/logger.js';
import { getScrapeStatus, runEuropeScrape } from '../services/europe-scrape.service.js';

export const scrapeCountryRouter = Router();

scrapeCountryRouter.get('/status', (req: Request, res: Response) => {
  const { country, website } = req.query as { country?: string; website?: string };
  if (!country || !website) {
    res.json({ phase: 'idle' });
    return;
  }
  const status = getScrapeStatus(country, website);
  res.json(status || { phase: 'idle' });
});

scrapeCountryRouter.post('/', async (req: Request, res: Response) => {
  const { country, website, keyword } = req.body as {
    country?: string;
    website?: string;
    keyword?: string;
  };

  if (!country || !website || !keyword) {
    res.status(400).json({ error: 'country, website, and keyword are required' });
    return;
  }

  logger.info({ country, website, keyword }, 'Country scrape requested');

  // Run in API process so GET /status can poll live phases (same process memory).
  // Scheduled scrapes use BullMQ europe-scrape instead.
  void runEuropeScrape({ country, website, keyword }).catch((err) => {
    logger.error({ err, country, website }, 'Manual country scrape failed');
  });

  res.json({
    status: 'queued',
    message: `Scraping "${keyword}" from ${website} (${country}). Results will appear shortly.`,
    country,
    website,
    keyword,
  });
});
