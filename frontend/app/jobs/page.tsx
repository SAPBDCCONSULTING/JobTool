'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchJobs, triggerCountryScrape, fetchScrapeStatus, type ScrapeStatusResponse } from '@/lib/api';
import type { JobsResponse, JobFilters } from '@/lib/types';
import { JobFiltersBar } from '@/components/jobs/JobFilters';
import { JobsTable } from '@/components/jobs/JobsTable';
import { Pagination } from '@/components/ui/Pagination';
import { RegionTreeFilter } from '@/components/filters/RegionTreeFilter';
import { EUROPE_COUNTRIES, REGIONS, type RegionSelection } from '@/lib/regions';

const DEFAULT_FILTERS: JobFilters = { page: 1, limit: 20 };

function selectionToFilters(
  selection: RegionSelection,
  base: JobFilters,
): JobFilters {
  const next: JobFilters = {
    ...base,
    region: undefined,
    country: undefined,
    jobWebsite: undefined,
    page: 1,
  };

  if (selection.level === 'region') {
    next.region = selection.region;
  } else if (selection.level === 'country') {
    next.region = selection.region;
    next.country = selection.country;
  } else if (selection.level === 'website') {
    next.region = selection.region;
    next.country = selection.country;
    next.jobWebsite = selection.website;
  }

  return next;
}

function filtersToSelection(filters: JobFilters): RegionSelection {
  if (filters.jobWebsite && filters.country && filters.region) {
    return {
      level: 'website',
      region: filters.region,
      country: filters.country,
      website: filters.jobWebsite,
    };
  }
  if (filters.country && filters.region) {
    return { level: 'country', region: filters.region, country: filters.country };
  }
  if (filters.region) {
    return { level: 'region', region: filters.region };
  }
  return { level: 'all' };
}

function JobsPageInner() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<JobFilters>(() => {
    const country = searchParams.get('country');
    return country ? { ...DEFAULT_FILTERS, country } : DEFAULT_FILTERS;
  });
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scrape state for the main content area
  const [scrapeKeyword, setScrapeKeyword] = useState('');
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeStatusResponse | null>(null);
  const [scraping, setScraping] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async (f: JobFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJobs(f);
      // When only a region is selected (e.g. Europe), narrow to known countries client-side
      // for live responses that don't yet support multi-country region filters.
      if (f.region && !f.country && f.region === 'Europe') {
        const europeSet = new Set(EUROPE_COUNTRIES.map((c) => c.toLowerCase()));
        const jobs = result.jobs.filter((j) => europeSet.has(j.country.toLowerCase()));
        // If the API already returned only matching rows (or demo filtered), keep totals;
        // otherwise approximate from this page. Prefer filtered demo totals from API path.
        if (jobs.length !== result.jobs.length) {
          setData({ ...result, jobs, total: jobs.length, totalPages: 1, page: 1 });
          return;
        }
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const handleFilterChange = (newFilters: JobFilters) => {
    setFilters({
      ...newFilters,
      region: filters.region,
      country: filters.country,
      jobWebsite: filters.jobWebsite,
      limit: filters.limit ?? 20,
    });
  };

  const handleRegionChange = (selection: RegionSelection) => {
    setFilters((prev) => selectionToFilters(selection, prev));
    setScrapeProgress(null);
    setScrapeKeyword('');
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const selection = filtersToSelection(filters);

  // Find website URL for current selection
  const selectedWebsiteUrl = (() => {
    if (selection.level === 'website') {
      const region = REGIONS.find(r => r.name === selection.region);
      const country = region?.countries.find(c => c.name === selection.country);
      return country?.websites.find(w => w.name === selection.website)?.url || null;
    }
    if (selection.level === 'country') {
      const region = REGIONS.find(r => r.name === selection.region);
      const country = region?.countries.find(c => c.name === selection.country);
      return country?.websites[0]?.url || null;
    }
    return null;
  })();

  const selectedCountry = selection.level === 'country' || selection.level === 'website'
    ? selection.country : null;

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const handleStartScrape = async () => {
    if (!selectedCountry || !selectedWebsiteUrl || !scrapeKeyword.trim()) return;
    setScraping(true);
    setScrapeProgress({ phase: 'scraping', message: `Scraping "${scrapeKeyword.trim()}"…` });
    try {
      await triggerCountryScrape(selectedCountry, selectedWebsiteUrl, scrapeKeyword.trim());
      // Start polling
      const poll = async () => {
        try {
          const s = await fetchScrapeStatus(selectedCountry!, selectedWebsiteUrl!);
          setScrapeProgress(s);
          if (s.phase === 'done' || s.phase === 'error' || s.phase === 'idle') {
            stopPolling();
            setScraping(false);
            if (s.phase === 'done') load(filters);
          }
        } catch { /* ignore */ }
      };
      pollRef.current = setInterval(poll, 3000);
      setTimeout(poll, 1500);
    } catch (err) {
      setScrapeProgress({ phase: 'error', message: err instanceof Error ? err.message : 'Failed' });
      setScraping(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* ── Header ──────────────────────────────────────── */}
      <div
        className="px-8 py-6 border-b border-slate-200/60 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Job Listings</h1>
            <p className="text-sky-200 text-sm mt-0.5">
              Filter by Region → Europe → Country → Job Website
            </p>
          </div>
          {data && (
            <div
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              {data.total.toLocaleString()} jobs found
            </div>
          )}
        </div>
      </div>

      {/* ── Body: tree + content ─────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        <div className="sticky top-0 self-start h-[calc(100vh-7.5rem)]">
          <RegionTreeFilter selection={selection} onChange={handleRegionChange} />
        </div>

        <div className="flex-1 min-w-0 px-8 py-6 space-y-5 overflow-y-auto">
          {(filters.region || filters.country || filters.jobWebsite) && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Active location:</span>
              {filters.region && (
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium">
                  {filters.region}
                </span>
              )}
              {filters.country && (
                <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-medium">
                  {filters.country}
                </span>
              )}
              {filters.jobWebsite && (
                <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium">
                  {filters.jobWebsite}
                </span>
              )}
            </div>
          )}

          {/* Scrape input when country/website selected */}
          {selectedCountry && selectedWebsiteUrl && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Scrape jobs from {selectedCountry}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Enter a keyword to search on <span className="font-medium text-indigo-600">{selectedWebsiteUrl.replace('https://www.', '')}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={scrapeKeyword}
                  onChange={(e) => setScrapeKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !scraping && handleStartScrape()}
                  placeholder="e.g. SAP, software developer, data analyst…"
                  disabled={scraping}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleStartScrape}
                  disabled={scraping || !scrapeKeyword.trim()}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {scraping ? 'Scraping…' : 'Start Scraping'}
                </button>
              </div>

              {/* Progress bar */}
              {scrapeProgress && scrapeProgress.phase !== 'idle' && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    {(scrapeProgress.phase === 'scraping' || scrapeProgress.phase === 'processing' || scrapeProgress.phase === 'classifying') && (
                      <svg className="w-4 h-4 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    )}
                    {scrapeProgress.phase === 'done' && (
                      <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {scrapeProgress.phase === 'error' && (
                      <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    )}
                    <span className={`text-sm font-medium ${
                      scrapeProgress.phase === 'done' ? 'text-emerald-700' :
                      scrapeProgress.phase === 'error' ? 'text-red-700' : 'text-indigo-700'
                    }`}>
                      {scrapeProgress.message}
                    </span>
                  </div>

                  {(scrapeProgress.phase === 'scraping' || scrapeProgress.phase === 'processing' || scrapeProgress.phase === 'classifying') && (
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ease-out ${
                        scrapeProgress.phase === 'scraping' ? 'w-[30%] bg-indigo-400 animate-pulse' :
                        scrapeProgress.phase === 'processing' ? 'w-[60%] bg-indigo-500' : 'w-[85%] bg-violet-500'
                      }`} />
                    </div>
                  )}
                  {scrapeProgress.phase === 'done' && (
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-full rounded-full bg-emerald-500 transition-all duration-500" />
                    </div>
                  )}

                  {scrapeProgress.itemsFound !== undefined && scrapeProgress.itemsFound > 0 && (
                    <p className="text-xs text-slate-500">
                      {scrapeProgress.itemsFound} jobs found
                      {scrapeProgress.itemsProcessed ? ` · ${scrapeProgress.itemsProcessed} processed` : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <JobFiltersBar filters={filters} onChange={handleFilterChange} />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <JobsTable jobs={data?.jobs ?? []} loading={loading} />

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full flex items-center justify-center text-sm text-slate-400">
        Loading jobs…
      </div>
    }>
      <JobsPageInner />
    </Suspense>
  );
}
