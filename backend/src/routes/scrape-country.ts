import { Router } from 'express';
import type { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../lib/logger.js';
import { processRawItems } from '../services/ingest.service.js';
import type { ApifyJobItem } from '../services/apify.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ScrapeStatus {
  phase: 'scraping' | 'processing' | 'classifying' | 'done' | 'error';
  message: string;
  itemsFound?: number;
  itemsProcessed?: number;
  startedAt: number;
}

const activeScrapes = new Map<string, ScrapeStatus>();

function scrapeKey(country: string, website: string) {
  return `${country}::${website}`;
}

export const scrapeCountryRouter = Router();

scrapeCountryRouter.get('/status', (req: Request, res: Response) => {
  const { country, website } = req.query as { country?: string; website?: string };
  if (!country || !website) {
    res.json({ phase: 'idle' });
    return;
  }
  const status = activeScrapes.get(scrapeKey(country, website));
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

  const key = scrapeKey(country, website);
  logger.info({ country, website, keyword }, 'Country scrape requested');

  activeScrapes.set(key, {
    phase: 'scraping',
    message: `Scraping "${keyword}" from ${website}…`,
    startedAt: Date.now(),
  });

  res.json({
    status: 'queued',
    message: `Scraping "${keyword}" from ${website} (${country}). Results will appear shortly.`,
    country,
    website,
    keyword,
  });

  const scraperDir = path.resolve(__dirname, '../../scraper');
  const scraperPath = path.resolve(scraperDir, 'scrape.py');
  const venvPython = path.resolve(scraperDir, 'venv/bin/python3');

  const proc = spawn(venvPython, [
    scraperPath,
    '--website', website,
    '--keyword', keyword,
    '--country', country,
  ], {
    cwd: scraperDir,
    env: { ...process.env },
  });

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (data: Buffer) => {
    stdout += data.toString();
  });

  proc.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  proc.on('close', async (code) => {
    if (code !== 0) {
      logger.error({ code, stderr, country, website }, 'Python scraper failed');
      activeScrapes.set(key, {
        phase: 'error',
        message: `Scraper failed (exit ${code})`,
        startedAt: Date.now(),
      });
      setTimeout(() => activeScrapes.delete(key), 30000);
      return;
    }

    try {
      const parsed = JSON.parse(stdout);

      // Structured bot / scrape error from Python
      if (parsed && !Array.isArray(parsed) && parsed.error) {
        const msg =
          parsed.error === 'bot_blocked'
            ? parsed.message || 'This website blocks automated scraping (bot protection).'
            : parsed.message || 'Scrape failed';
        logger.warn({ country, website, keyword, error: parsed.error }, 'Scraper returned error status');
        activeScrapes.set(key, {
          phase: 'error',
          message: msg,
          itemsFound: 0,
          startedAt: Date.now(),
        });
        setTimeout(() => activeScrapes.delete(key), 45000);
        return;
      }

      const items: ApifyJobItem[] = Array.isArray(parsed) ? parsed : [];
      if (items.length === 0) {
        logger.warn({ country, website, keyword }, 'Scraper returned 0 items');
        activeScrapes.set(key, {
          phase: 'done',
          message: 'No jobs found for this keyword.',
          itemsFound: 0,
          startedAt: Date.now(),
        });
        setTimeout(() => activeScrapes.delete(key), 30000);
        return;
      }

      activeScrapes.set(key, {
        phase: 'processing',
        message: `Found ${items.length} jobs, processing…`,
        itemsFound: items.length,
        startedAt: Date.now(),
      });

      logger.info({ count: items.length, country, website }, 'Scraper returned items, processing');
      const result = await processRawItems(items, keyword, country, { skipFilter: true });

      activeScrapes.set(key, {
        phase: 'classifying',
        message: `Classifying ${result.cleanInserted} jobs with AI…`,
        itemsFound: items.length,
        itemsProcessed: result.cleanInserted,
        startedAt: Date.now(),
      });

      // Auto-mark done after a delay (AI classification happens via worker)
      setTimeout(() => {
        activeScrapes.set(key, {
          phase: 'done',
          message: `Complete! ${result.cleanInserted} jobs added.`,
          itemsFound: items.length,
          itemsProcessed: result.cleanInserted,
          startedAt: Date.now(),
        });
        setTimeout(() => activeScrapes.delete(key), 30000);
      }, 15000);

      logger.info({ ...result, country, website }, 'Country scrape ingestion complete');
    } catch (err) {
      logger.error({ err, stdout: stdout.slice(0, 500), country }, 'Failed to parse scraper output');
      activeScrapes.set(key, {
        phase: 'error',
        message: 'Failed to parse scraper output',
        startedAt: Date.now(),
      });
      setTimeout(() => activeScrapes.delete(key), 30000);
    }
  });
});
