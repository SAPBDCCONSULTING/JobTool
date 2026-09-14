import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const APIFY_BASE = 'https://api.apify.com/v2';

export interface ApifyJobItem {
  id?: string;
  jobId?: string;
  title?: string;
  description?: string;
  descriptionHtml?: string;
  companyName?: string;
  company?: string;
  companyId?: string;
  companyUrl?: string;
  location?: string;
  publishedAt?: string;
  url?: string;
  [key: string]: unknown;
}

interface ApifyRunData {
  id: string;
  status: string;
  defaultDatasetId: string;
}

async function apifyFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${APIFY_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.APIFY_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new Error(
        `Apify authentication failed (401) on ${path}. Check APIFY_API_TOKEN in backend/.env and restart API + worker. Response: ${body}`,
      );
    }
    throw new Error(`Apify API ${response.status} on ${path}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function triggerApifyRun(
  keyword: string,
  location: string,
): Promise<{ runId: string; datasetId: string }> {
  const input = {
    enrichCompanyData: true,
    keyword: [keyword],
    location,
    maxItems: env.APIFY_MAX_ITEMS,
    publishedAt: 'r86400',
    saveOnlyUniqueItems: true,
  };

  logger.info({ keyword, location }, 'Triggering Apify actor run');

  const result = await apifyFetch<{ data: ApifyRunData }>(
    `/acts/${env.APIFY_ACTOR_ID}/runs`,
    { method: 'POST', body: JSON.stringify(input) },
  );

  logger.info({ runId: result.data.id }, 'Apify run started');
  return { runId: result.data.id, datasetId: result.data.defaultDatasetId };
}

export async function waitForApifyRun(
  runId: string,
  maxWaitMs = 600_000,
): Promise<string> {
  const pollInterval = 5_000;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const result = await apifyFetch<{ data: ApifyRunData }>(`/actor-runs/${runId}`);
    const { status, defaultDatasetId } = result.data;

    logger.debug({ runId, status }, 'Apify run status');

    if (status === 'SUCCEEDED') {
      logger.info({ runId }, 'Apify run succeeded');
      return defaultDatasetId;
    }

    if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(status)) {
      throw new Error(`Apify run ${runId} ended with status: ${status}`);
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error(`Apify run ${runId} timed out after ${maxWaitMs}ms`);
}

export async function fetchApifyDataset(datasetId: string): Promise<ApifyJobItem[]> {
  logger.info({ datasetId }, 'Fetching Apify dataset items');

  const result = await apifyFetch<ApifyJobItem[] | { items: ApifyJobItem[] }>(
    `/datasets/${datasetId}/items?clean=true&limit=200`,
  );

  const items = Array.isArray(result) ? result : (result as { items: ApifyJobItem[] }).items ?? [];
  logger.info({ count: items.length }, 'Dataset items fetched');
  return items;
}
