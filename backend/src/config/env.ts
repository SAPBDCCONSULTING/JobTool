import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  APIFY_API_TOKEN: z.string().min(1, 'APIFY_API_TOKEN is required'),
  APIFY_ACTOR_ID: z.string().default('2rJKkhh7vjpX7pvjg'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Enable recurring LinkedIn + Europe scrapes (worker process). */
  SCHEDULER_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  /** Interval between full scan cycles (ms). Default: 24 hours. */
  SCHEDULER_INTERVAL_MS: z.coerce.number().default(24 * 60 * 60 * 1000),
  /** Default keyword for scheduled LinkedIn + Europe scrapes. */
  SCHEDULER_KEYWORD: z.string().default('SAP'),
  /** Comma-separated LinkedIn locations for daily scans. */
  SCHEDULER_LINKEDIN_LOCATIONS: z
    .string()
    .default('Saudi Arabia,United Arab Emirates,Germany,United Kingdom'),
  /** Stagger between Europe scrape jobs within a cycle (ms). Default: 3 min. */
  SCHEDULER_EUROPE_STAGGER_MS: z.coerce.number().default(3 * 60 * 1000),
  /** Re-run company intelligence at most this often when jobs/relevance change. */
  COMPANY_INTEL_REFRESH_DAYS: z.coerce.number().default(3),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
