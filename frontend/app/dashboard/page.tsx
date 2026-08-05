'use client';

import { useEffect, useState } from 'react';
import { fetchStats } from '@/lib/api';
import type { StatsResponse } from '@/lib/types';
import { StatsCard } from '@/components/ui/StatsCard';
import { SearchForm } from '@/components/search/SearchForm';
import { ConfidenceBadge, DomainBadge, StatusBadge } from '@/components/ui/ConfidenceBadge';

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setError(null);
      const data = await fetchStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 6000);
  };

  return (
    <div className="min-h-full">
      {/* ── Page header ─────────────────────────────────── */}
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-indigo-200 text-sm mt-0.5">
              Hiring intent intelligence overview
            </p>
          </div>
          <div className="flex items-center gap-2 text-indigo-200 text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="px-8 py-7 space-y-7">
        {/* ── Toast ───────────────────────────────────────── */}
        {toast && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm font-medium shadow-sm">
            <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {toast}
            <button onClick={() => setToast(null)} className="ml-auto text-emerald-600 hover:text-emerald-800">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* ── Stats cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title="Total Jobs Fetched"
            value={loading ? '—' : (stats?.totalRaw ?? 0)}
            subtitle="from Apify across all searches"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            }
          />
          <StatsCard
            title="Filtered & Relevant"
            value={loading ? '—' : (stats?.totalClean ?? 0)}
            subtitle="after rule-based filtering"
            gradient="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            }
          />
          <StatsCard
            title="AI Processed"
            value={loading ? '—' : (stats?.totalProcessed ?? 0)}
            subtitle={loading ? '' : `${stats?.pendingCount ?? 0} pending classification`}
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
              </svg>
            }
          />
          <StatsCard
            title="High Confidence"
            value={loading ? '—' : (stats?.highConfidence ?? 0)}
            subtitle="confidence score ≥ 70%"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            }
            badge="🎯 Intent signals"
          />
        </div>

        {/* ── Middle row: Search + Domain breakdown ───────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Search form */}
          <div className="xl:col-span-1">
            <SearchForm onSuccess={showToast} />

            {/* Domain breakdown */}
            {!loading && stats && stats.domains.length > 0 && (
              <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-semibold text-slate-700 text-sm mb-4">Domain Breakdown</h3>
                <div className="space-y-3">
                  {stats.domains.map((d) => {
                    const max = stats.domains[0]?.count ?? 1;
                    const pct = Math.round((d.count / max) * 100);
                    return (
                      <div key={d.name}>
                        <div className="flex justify-between items-center mb-1">
                          <DomainBadge domain={d.name} />
                          <span className="text-xs font-semibold text-slate-600">{d.count}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Recent jobs */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Recent Activity</h3>
              <a href="/jobs" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                View all →
              </a>
            </div>

            {loading ? (
              <div className="animate-pulse p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                    </div>
                    <div className="h-5 bg-slate-200 rounded-full w-14" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(stats?.recentJobs ?? []).map((job) => (
                  <div key={job.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: `hsl(${(job.companyName.charCodeAt(0) * 47) % 360}, 60%, 48%)` }}
                    >
                      {job.companyName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{job.jobTitle}</p>
                      <p className="text-xs text-slate-500">{job.companyName} · {job.country}</p>
                    </div>
                    <DomainBadge domain={job.domain} />
                    <StatusBadge status={job.aiStatus} />
                    {job.confidence !== null && (
                      <ConfidenceBadge value={job.confidence} />
                    )}
                  </div>
                ))}
                {(!stats?.recentJobs || stats.recentJobs.length === 0) && (
                  <div className="px-6 py-10 text-center text-sm text-slate-400">
                    No jobs yet. Trigger a search to get started.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Countries ───────────────────────────────────── */}
        {!loading && stats && stats.countries.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-700 text-sm mb-5">Jobs by Country</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {stats.countries.map((c, i) => (
                <div
                  key={c.name}
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: `linear-gradient(135deg, hsl(${220 + i * 30}, 80%, 96%) 0%, hsl(${220 + i * 30}, 70%, 92%) 100%)`,
                  }}
                >
                  <div
                    className="text-xl font-bold mb-1"
                    style={{ color: `hsl(${220 + i * 30}, 60%, 40%)` }}
                  >
                    {c.count}
                  </div>
                  <div className="text-xs font-medium" style={{ color: `hsl(${220 + i * 30}, 50%, 45%)` }}>
                    {c.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
