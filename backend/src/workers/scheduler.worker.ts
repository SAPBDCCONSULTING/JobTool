import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { env } from '../config/env.js';
import {
  buildEuropeTargets,
  buildLinkedInTargets,
} from '../config/scrape-schedule.js';
import { europeScrapeQueue, ingestionQueue, schedulerQueue } from '../lib/queue.js';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { enqueueStaleCompanyIntelligence } from '../services/company-intel.service.js';

const DAILY_SCAN_JOB = 'daily-scan';
const REPEATABLE_JOB_ID = 'hireintel-daily-scan';

async function runDailyScan(job: Job) {
  const keyword = env.SCHEDULER_KEYWORD;
  const linkedIn = buildLinkedInTargets(keyword, env.SCHEDULER_LINKEDIN_LOCATIONS);
  const europe = buildEuropeTargets(keyword);
  const staggerMs = env.SCHEDULER_EUROPE_STAGGER_MS;

  logger.info(
    {
      jobId: job.id,
      keyword,
      linkedInCount: linkedIn.length,
      europeCount: europe.length,
      staggerMs,
    },
    'Daily scan cycle starting',
  );

  for (let i = 0; i < linkedIn.length; i++) {
    const target = linkedIn[i]!;
    await ingestionQueue.add(
      'ingest',
      target,
      {
        jobId: `sched-linkedin-${slug(target.keyword)}-${slug(target.location)}-${Date.now()}-${i}`,
        delay: i * 30_000, // 30s between LinkedIn locations
      },
    );
  }

  for (let i = 0; i < europe.length; i++) {
    const target = europe[i]!;
    await europeScrapeQueue.add(
      'scrape',
      target,
      {
        jobId: `sched-europe-${slug(target.website)}-${Date.now()}-${i}`,
        delay: i * staggerMs,
      },
    );
  }

  // Re-score companies past the 3-day window when jobs/relevance changed
  const staleIntel = await enqueueStaleCompanyIntelligence();

  logger.info(
    {
      queuedLinkedIn: linkedIn.length,
      queuedEurope: europe.length,
      staleCompanyIntel: staleIntel,
    },
    'Daily scan cycle queued',
  );

  return {
    linkedIn: linkedIn.length,
    europe: europe.length,
    staleCompanyIntel: staleIntel,
  };
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function createSchedulerWorker() {
  const worker = new Worker('scheduler', runDailyScan, {
    connection: redis,
    concurrency: 1,
  });

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, result }, 'Scheduler daily-scan completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Scheduler daily-scan failed');
  });

  return worker;
}

/**
 * Register (or refresh) the 24h repeatable orchestrator job.
 * Safe to call on every worker boot — removes prior HireIntel schedule keys first.
 */
export async function registerDailySchedule() {
  if (!env.SCHEDULER_ENABLED) {
    logger.info('Scheduler disabled (SCHEDULER_ENABLED=false)');
    // Remove any leftover repeatables so disabling takes effect immediately
    const existing = await schedulerQueue.getRepeatableJobs();
    for (const job of existing) {
      if (job.id === REPEATABLE_JOB_ID || job.name === DAILY_SCAN_JOB) {
        await schedulerQueue.removeRepeatableByKey(job.key);
        logger.info({ key: job.key }, 'Removed scheduler repeatable (disabled)');
      }
    }
    return;
  }

  const intervalMs = env.SCHEDULER_INTERVAL_MS;

  const existing = await schedulerQueue.getRepeatableJobs();
  for (const job of existing) {
    if (job.id === REPEATABLE_JOB_ID || job.name === DAILY_SCAN_JOB) {
      await schedulerQueue.removeRepeatableByKey(job.key);
    }
  }

  await schedulerQueue.add(
    DAILY_SCAN_JOB,
    { source: 'scheduler' },
    {
      repeat: { every: intervalMs },
      jobId: REPEATABLE_JOB_ID,
    },
  );

  const hours = Math.round(intervalMs / (60 * 60 * 1000) * 10) / 10;
  logger.info(
    {
      intervalMs,
      everyHours: hours,
      keyword: env.SCHEDULER_KEYWORD,
      linkedInLocations: env.SCHEDULER_LINKEDIN_LOCATIONS,
    },
    `✅ Scheduler registered — full scan every ${hours}h`,
  );
}
