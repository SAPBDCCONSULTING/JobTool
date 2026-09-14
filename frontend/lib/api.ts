import type {
  StatsResponse,
  JobsResponse,
  JobDetail,
  CompaniesResponse,
  JobFilters,
  SearchResult,
  KeywordsResponse,
  Keyword,
  SourcesResponse,
  Source,
  RunsResponse,
  CompanyDetail,
  OutreachEmail,
  OutreachResponse,
} from './types';
import { demoStats, getDemoJobs, getDemoCompanies } from './demo/data';

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
  if (filters.minRelevance !== undefined)
    params.set('minRelevance', String(filters.minRelevance));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return apiFetch<JobsResponse>(`/api/jobs${qs ? `?${qs}` : ''}`);
}

export async function fetchJobDetail(id: string): Promise<JobDetail> {
  const { job } = await apiFetch<{ job: JobDetail }>(`/api/jobs/${id}`);
  return job;
}

// ─── Companies ────────────────────────────────────────────────
export async function fetchCompanies(): Promise<CompaniesResponse> {
  if (USE_DEMO) return getDemoCompanies();
  return apiFetch<CompaniesResponse>('/api/companies');
}

export async function fetchCompany(id: string): Promise<CompanyDetail> {
  return apiFetch<CompanyDetail>(`/api/companies/${id}`);
}

export async function recalculateCompany(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  return apiFetch<{ ok: boolean; message: string }>(`/api/companies/${id}/recalculate`, {
    method: 'POST',
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

// ─── Keywords ───────────────────────────────────────────────────
export async function fetchKeywords(): Promise<KeywordsResponse> {
  return apiFetch<KeywordsResponse>('/api/keywords');
}

export async function createKeyword(input: {
  term: string;
  location?: string;
  category?: string;
  scheduleHours?: number;
}): Promise<{ keyword: Keyword }> {
  return apiFetch<{ keyword: Keyword }>('/api/keywords', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateKeyword(
  id: string,
  patch: {
    enabled?: boolean;
    location?: string | null;
    scheduleHours?: number;
    category?: string;
  },
): Promise<{ keyword: Keyword }> {
  return apiFetch<{ keyword: Keyword }>(`/api/keywords/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteKeyword(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/keywords/${id}`, { method: 'DELETE' });
}

export async function triggerKeywordRun(id: string): Promise<{ ok: boolean; created: number }> {
  return apiFetch<{ ok: boolean; created: number }>(`/api/keywords/${id}/run`, { method: 'POST' });
}

// ─── Sources ────────────────────────────────────────────────────
export async function fetchSources(): Promise<SourcesResponse> {
  return apiFetch<SourcesResponse>('/api/sources');
}

export async function toggleSource(
  name: string,
  enabled: boolean,
): Promise<{ source: Source }> {
  return apiFetch<{ source: Source }>(`/api/sources/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function syncSources(): Promise<{ ok: boolean; count: number }> {
  return apiFetch<{ ok: boolean; count: number }>('/api/sources/sync', { method: 'POST' });
}

// ─── Runs ───────────────────────────────────────────────────────
export async function fetchRuns(params?: { page?: number; limit?: number }): Promise<RunsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  return apiFetch<RunsResponse>(`/api/runs${qs.toString() ? `?${qs}` : ''}`);
}

export async function triggerAllRuns(): Promise<{ ok: boolean; created: number }> {
  return apiFetch<{ ok: boolean; created: number }>('/api/runs/trigger', { method: 'POST' });
}

export async function retryRun(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/api/runs/${id}/retry`, { method: 'POST' });
}

export async function scrapeSource(
  name: string,
  keyword: string,
): Promise<{ ok: boolean; status: string; runId: string; message: string }> {
  return apiFetch<{ ok: boolean; status: string; runId: string; message: string }>(
    `/api/sources/${encodeURIComponent(name)}/scrape`,
    { method: 'POST', body: JSON.stringify({ keyword }) },
  );
}

// ─── Outreach ─────────────────────────────────────────────────
export async function generateOutreach(
  companyId: string,
): Promise<{ email: OutreachEmail }> {
  return apiFetch<{ email: OutreachEmail }>(`/api/companies/${companyId}/outreach`, {
    method: 'POST',
  });
}

export async function fetchOutreach(): Promise<OutreachResponse> {
  return apiFetch<OutreachResponse>('/api/outreach');
}

export async function updateOutreach(
  id: string,
  patch: { subject?: string; body?: string; status?: 'draft' | 'sent' | 'done' },
): Promise<{ email: OutreachEmail }> {
  return apiFetch<{ email: OutreachEmail }>(`/api/outreach/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteOutreach(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/outreach/${id}`, { method: 'DELETE' });
}
