'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchJobs } from '@/lib/api';
import type { JobsResponse, JobFilters } from '@/lib/types';
import { JobFiltersBar } from '@/components/jobs/JobFilters';
import { JobsTable } from '@/components/jobs/JobsTable';
import { Pagination } from '@/components/ui/Pagination';

const DEFAULT_FILTERS: JobFilters = { page: 1, limit: 20 };

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: JobFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJobs(f);
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
    setFilters({ ...newFilters, limit: filters.limit ?? 20 });
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div className="min-h-full">
      {/* ── Header ──────────────────────────────────────── */}
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Job Listings</h1>
            <p className="text-sky-200 text-sm mt-0.5">
              Filtered and AI-classified job postings
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

      <div className="px-8 py-6 space-y-5">
        {/* ── Filters ─────────────────────────────────────── */}
        <JobFiltersBar filters={filters} onChange={handleFilterChange} />

        {/* ── Error ───────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────── */}
        <JobsTable jobs={data?.jobs ?? []} loading={loading} />

        {/* ── Pagination ──────────────────────────────────── */}
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
  );
}
