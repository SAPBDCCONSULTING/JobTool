import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../lib/logger.js';
import { processRawItems } from './ingest.service.js';
import type { ApifyJobItem } from './apify.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ScrapeStatus {
  phase: 'scraping' | 'processing' | 'classifying' | 'done' | 'error';
  message: string;
  itemsFound?: number;
  itemsProcessed?: number;
  startedAt: number;
}

export interface EuropeScrapeResult {
  itemsFound: number;
  itemsProcessed: number;
}

const activeScrapes = new Map<string, ScrapeStatus>();

export function scrapeKey(country: string, website: string) {
  return `${country}::${website}`;
}

export function getScrapeStatus(country: string, website: string): ScrapeStatus | undefined {
  return activeScrapes.get(scrapeKey(country, website));
}

function setStatus(key: string, status: ScrapeStatus) {
  activeScrapes.set(key, status);
}

function clearStatusLater(key: string, ms: number) {
  setTimeout(() => activeScrapes.delete(key), ms);
}

/**
 * Run a Europe Playwright scrape + ingest.
 * Used by the HTTP route (live status) and the europe-scrape worker (scheduled).
 */
export function runEuropeScrape(opts: {
  country: string;
  website: string;
  keyword: string;
}): Promise<EuropeScrapeResult> {
  const { country, website, keyword } = opts;
  const key = scrapeKey(country, website);

  setStatus(key, {
    phase: 'scraping',
    message: `Scraping "${keyword}" from ${website}…`,
    startedAt: Date.now(),
  });

  const scraperDir = path.resolve(__dirname, '../../scraper');
  const scraperPath = path.resolve(scraperDir, 'scrape.py');
  const venvPython = path.resolve(scraperDir, 'venv/bin/python3');

  return new Promise((resolve, reject) => {
    const proc = spawn(
      venvPython,
      [scraperPath, '--website', website, '--keyword', keyword, '--country', country],
      {
        cwd: scraperDir,
        env: { ...process.env },
      },
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      logger.error({ err, country, website }, 'Failed to spawn Python scraper');
      setStatus(key, {
        phase: 'error',
        message: err.message || 'Failed to start scraper',
        startedAt: Date.now(),
      });
      clearStatusLater(key, 30000);
      reject(err);
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        logger.error({ code, stderr, country, website }, 'Python scraper failed');
        setStatus(key, {
          phase: 'error',
          message: `Scraper failed (exit ${code})`,
          startedAt: Date.now(),
        });
        clearStatusLater(key, 30000);
        reject(new Error(`Scraper failed (exit ${code})`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);

        if (parsed && !Array.isArray(parsed) && parsed.error) {
          const msg =
            parsed.error === 'bot_blocked'
              ? parsed.message || 'This website blocks automated scraping (bot protection).'
              : parsed.message || 'Scrape failed';
          logger.warn({ country, website, keyword, error: parsed.error }, 'Scraper returned error status');
          setStatus(key, {
            phase: 'error',
            message: msg,
            itemsFound: 0,
            startedAt: Date.now(),
          });
          clearStatusLater(key, 45000);
          reject(new Error(msg));
          return;
        }

        const items: ApifyJobItem[] = Array.isArray(parsed) ? parsed : [];
        if (items.length === 0) {
          logger.warn({ country, website, keyword }, 'Scraper returned 0 items');
          setStatus(key, {
            phase: 'done',
            message: 'No jobs found for this keyword.',
            itemsFound: 0,
            startedAt: Date.now(),
          });
          clearStatusLater(key, 30000);
          resolve({ itemsFound: 0, itemsProcessed: 0 });
          return;
        }

        setStatus(key, {
          phase: 'processing',
          message: `Found ${items.length} jobs, processing…`,
          itemsFound: items.length,
          startedAt: Date.now(),
        });

        logger.info({ count: items.length, country, website }, 'Scraper returned items, processing');
        const result = await processRawItems(items, keyword, country, { skipFilter: true });

        setStatus(key, {
          phase: 'classifying',
          message: `Classifying ${result.cleanInserted} jobs with AI…`,
          itemsFound: items.length,
          itemsProcessed: result.cleanInserted,
          startedAt: Date.now(),
        });

        setTimeout(() => {
          setStatus(key, {
            phase: 'done',
            message: `Complete! ${result.cleanInserted} jobs added.`,
            itemsFound: items.length,
            itemsProcessed: result.cleanInserted,
            startedAt: Date.now(),
          });
          clearStatusLater(key, 30000);
        }, 15000);

        logger.info({ ...result, country, website }, 'Country scrape ingestion complete');
        resolve({ itemsFound: items.length, itemsProcessed: result.cleanInserted });
      } catch (err) {
        logger.error({ err, stdout: stdout.slice(0, 500), country }, 'Failed to parse scraper output');
        setStatus(key, {
          phase: 'error',
          message: 'Failed to parse scraper output',
          startedAt: Date.now(),
        });
        clearStatusLater(key, 30000);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  });
}
