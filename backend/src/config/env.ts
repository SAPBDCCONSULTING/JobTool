import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  APIFY_API_TOKEN: z.string().min(1, 'APIFY_API_TOKEN is required'),
  APIFY_ACTOR_ID: z.string().default('2rJKkhh7vjpX7pvjg'),
  APIFY_MAX_ITEMS: z.coerce.number().default(150),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Scraper (Python/Playwright) config
  SCRAPER_PYTHON: z.string().default('venv/bin/python3'), // path relative to backend/scraper/
  COUNTRY_SCRAPE_CONCURRENCY: z.coerce.number().default(2),
  COUNTRY_SCRAPE_TIMEOUT_MS: z.coerce.number().default(180_000),

  // Scheduler
  SCHEDULER_CRON_PATTERN: z.string().default('*/15 * * * *'),
  SOURCE_FETCH_CONCURRENCY: z.coerce.number().default(1),

  // Company intelligence & scoring
  COMPANY_INTEL_CONCURRENCY: z.coerce.number().default(2),
  RECALC_DEBOUNCE_MS: z.coerce.number().default(600_000), // 10 min coalescing window
  MIN_JOB_RELEVANCE: z.coerce.number().default(40), // jobs below this relevance never count toward company metrics/scores
  JOB_STALE_DAYS: z.coerce.number().default(14),
  SCORE_WEIGHT_RELEVANCE: z.coerce.number().default(30),
  SCORE_WEIGHT_VOLUME: z.coerce.number().default(25),
  SCORE_WEIGHT_VELOCITY: z.coerce.number().default(25),
  SCORE_WEIGHT_OUTSOURCING: z.coerce.number().default(20),

  // Description enrichment (detail-page fetch for jobs without descriptions)
  DESC_ENRICH_CONCURRENCY: z.coerce.number().default(1),
  DESC_ENRICH_BATCH: z.coerce.number().default(8),
  DESC_ENRICH_TIMEOUT_MS: z.coerce.number().default(300_000),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
