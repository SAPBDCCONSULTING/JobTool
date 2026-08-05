'use client';

import { useEffect, useState } from 'react';
import { fetchCompanies } from '@/lib/api';
import type { Company } from '@/lib/types';
import { CompaniesTable } from '@/components/companies/CompaniesTable';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCompanies()
      .then((res) => setCompanies(res.companies))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load companies'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = companies.filter(
    (c) =>
      !search ||
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase()),
  );

  const totalJobs = companies.reduce((sum, c) => sum + c.jobCount, 0);
  const avgConf = companies.length
    ? companies.reduce((sum, c) => sum + (c.avgConfidence ?? 0), 0) / companies.length
    : 0;

  return (
    <div className="min-h-full">
      {/* ── Header ──────────────────────────────────────── */}
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Company Intelligence</h1>
            <p className="text-emerald-100 text-sm mt-0.5">
              Ranked by hiring intent signal strength
            </p>
          </div>
          {!loading && (
            <div className="flex gap-3">
              <div
                className="px-4 py-2 rounded-xl text-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <div className="text-lg font-bold text-white">{companies.length}</div>
                <div className="text-xs text-emerald-100">Companies</div>
              </div>
              <div
                className="px-4 py-2 rounded-xl text-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <div className="text-lg font-bold text-white">{totalJobs.toLocaleString()}</div>
                <div className="text-xs text-emerald-100">Total Jobs</div>
              </div>
              <div
                className="px-4 py-2 rounded-xl text-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <div className="text-lg font-bold text-white">{Math.round(avgConf * 100)}%</div>
                <div className="text-xs text-emerald-100">Avg Score</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* ── Search bar ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="relative max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or country…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────── */}
        <CompaniesTable companies={filtered} loading={loading} />

        {search && !loading && (
          <p className="text-sm text-slate-400 text-center">
            Showing {filtered.length} of {companies.length} companies
          </p>
        )}
      </div>
    </div>
  );
}
