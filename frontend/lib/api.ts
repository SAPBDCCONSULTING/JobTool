import type {
  StatsResponse,
  JobsResponse,
  CompaniesResponse,
  OpportunitiesResponse,
  PitchesResponse,
  FeedbackResponse,
  FeedbackOutcome,
  OpportunityStage,
  JobFilters,
  SearchResult,
} from './types';
import {
  demoStats,
  getDemoJobs,
  getDemoCompanies,
  getDemoOpportunities,
  getDemoPitches,
  getDemoFeedback,
} from './demo/data';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const USE_DEMO = process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'true';
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Stats ────────────────────────────────────────────────────
export async function fetchStats(): Promise<StatsResponse> {
  if (USE_DEMO) return demoStats;
  return apiFetch<StatsResponse>('/api/stats');
}

// ─── Jobs ─────────────────────────────────────────────────────
export async function fetchJobs(filters: JobFilters = {}): Promise<JobsResponse> {
  if (USE_DEMO) return getDemoJobs(filters);

  const params = new URLSearchParams();
  if (filters.country) params.set('country', filters.country);
  if (filters.domain) params.set('domain', filters.domain);
  if (filters.companyName) params.set('companyName', filters.companyName);
  if (filters.aiStatus) params.set('aiStatus', filters.aiStatus);
  if (filters.minConfidence !== undefined)
    params.set('minConfidence', String(filters.minConfidence));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return apiFetch<JobsResponse>(`/api/jobs${qs ? `?${qs}` : ''}`);
}

// ─── Companies ────────────────────────────────────────────────
export async function fetchCompanies(): Promise<CompaniesResponse> {
  if (USE_DEMO) return getDemoCompanies();
  return apiFetch<CompaniesResponse>('/api/companies');
}

export async function triggerCompanyAnalysis(): Promise<{
  status: string;
  message: string;
  queued: number;
}> {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      status: 'queued',
      message: '[Demo] Company intelligence analysis simulated.',
      queued: 0,
    };
  }
  return apiFetch('/api/companies/analyze', { method: 'POST' });
}

// ─── Opportunities ────────────────────────────────────────────
export async function fetchOpportunities(filters?: {
  stage?: OpportunityStage;
  country?: string;
  minScore?: number;
}): Promise<OpportunitiesResponse> {
  if (USE_DEMO) return getDemoOpportunities(filters);

  const params = new URLSearchParams();
  if (filters?.stage) params.set('stage', filters.stage);
  if (filters?.country) params.set('country', filters.country);
  if (filters?.minScore !== undefined) params.set('minScore', String(filters.minScore));
  const qs = params.toString();
  return apiFetch<OpportunitiesResponse>(`/api/opportunities${qs ? `?${qs}` : ''}`);
}

export async function syncOpportunities(): Promise<{
  status: string;
  message: string;
  upserted: number;
  skipped: number;
}> {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      status: 'ok',
      message: '[Demo] Opportunity sync simulated.',
      upserted: 0,
      skipped: 0,
    };
  }
  return apiFetch('/api/opportunities/sync', { method: 'POST' });
}

export async function updateOpportunityStage(
  id: string,
  stage: OpportunityStage,
  notes?: string,
): Promise<{ id: string; stage: OpportunityStage }> {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 300));
    return { id, stage };
  }
  return apiFetch(`/api/opportunities/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage, notes }),
  });
}

// ─── Pitches / Outreach ───────────────────────────────────────
export async function fetchPitches(filters?: {
  status?: string;
  country?: string;
}): Promise<PitchesResponse> {
  if (USE_DEMO) return getDemoPitches(filters);

  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.country) params.set('country', filters.country);
  const qs = params.toString();
  return apiFetch<PitchesResponse>(`/api/pitches${qs ? `?${qs}` : ''}`);
}

export async function triggerPitchGeneration(): Promise<{
  status: string;
  message: string;
  queued: number;
}> {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      status: 'queued',
      message: '[Demo] Pitch generation simulated.',
      queued: 0,
    };
  }
  return apiFetch('/api/pitches/generate', { method: 'POST' });
}

export async function regeneratePitch(id: string): Promise<{
  status: string;
  message: string;
}> {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 400));
    return { status: 'queued', message: '[Demo] Pitch regenerate simulated.' };
  }
  return apiFetch(`/api/pitches/${id}/regenerate`, { method: 'POST' });
}

// ─── Feedback loop ────────────────────────────────────────────
export async function fetchFeedback(filters?: {
  opportunityId?: string;
  outcome?: FeedbackOutcome;
}): Promise<FeedbackResponse> {
  if (USE_DEMO) return getDemoFeedback(filters);

  const params = new URLSearchParams();
  if (filters?.opportunityId) params.set('opportunityId', filters.opportunityId);
  if (filters?.outcome) params.set('outcome', filters.outcome);
  const qs = params.toString();
  return apiFetch<FeedbackResponse>(`/api/feedback${qs ? `?${qs}` : ''}`);
}

export async function recordFeedback(input: {
  opportunityId: string;
  outcome: FeedbackOutcome;
  notes?: string;
  recordedBy?: string;
}): Promise<{
  status: string;
  message: string;
  stage: OpportunityStage;
}> {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      status: 'ok',
      message: `[Demo] Recorded ${input.outcome}`,
      stage: input.outcome,
    };
  }
  return apiFetch('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ─── Search ───────────────────────────────────────────────────
export async function triggerSearch(
  keyword: string,
  location: string,
): Promise<SearchResult> {
  if (USE_DEMO) {
    // Simulate a queued response in demo mode
    await new Promise((r) => setTimeout(r, 800));
    return {
      status: 'queued',
      message: `[Demo mode] Search for "${keyword}" in "${location}" simulated. Switch to live mode by setting NEXT_PUBLIC_USE_DEMO_DATA=false.`,
      keyword,
      location,
    };
  }
  return apiFetch<SearchResult>('/api/search', {
    method: 'POST',
    body: JSON.stringify({ keyword, location }),
  });
}

// ─── Country Scrape ───────────────────────────────────────────
export interface CountryScrapeResult {
  status: 'queued';
  message: string;
  country: string;
  website: string;
  keyword: string;
}

export async function triggerCountryScrape(
  country: string,
  website: string,
  keyword: string,
): Promise<CountryScrapeResult> {
  if (USE_DEMO) {
    await new Promise((r) => setTimeout(r, 800));
    return {
      status: 'queued',
      message: `[Demo] Scraping "${keyword}" from ${website} (${country}) simulated.`,
      country,
      website,
      keyword,
    };
  }
  return apiFetch<CountryScrapeResult>('/api/scrape-country', {
    method: 'POST',
    body: JSON.stringify({ country, website, keyword }),
  });
}

export interface ScrapeStatusResponse {
  phase: 'idle' | 'scraping' | 'processing' | 'classifying' | 'done' | 'error';
  message?: string;
  itemsFound?: number;
  itemsProcessed?: number;
}

export async function fetchScrapeStatus(
  country: string,
  website: string,
): Promise<ScrapeStatusResponse> {
  return apiFetch<ScrapeStatusResponse>(
    `/api/scrape-country/status?country=${encodeURIComponent(country)}&website=${encodeURIComponent(website)}`,
  );
}
