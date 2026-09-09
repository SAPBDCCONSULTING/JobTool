'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchStats } from '@/lib/api';
import type { SearchResult, StatsResponse } from '@/lib/types';
import { StatsCard } from '@/components/ui/StatsCard';
import { SearchForm } from '@/components/search/SearchForm';
import { ConfidenceBadge, DomainBadge, StatusBadge } from '@/components/ui/ConfidenceBadge';
import { SectionTitleWithInfo, SECTION_INFO } from '@/components/ui/SectionInfoButton';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchTracking, setSearchTracking] = useState<{
    keyword: string;
    location: string;
    pendingCount: number | null;
    peakPending: number | null;
    baselineRaw: number;
    baselineClean: number;
    baselineProcessed: number;
    seenProgress: boolean;
    startedAt: number;
  } | null>(null);

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

  // Auto-poll when there are pending jobs (even without a manual search trigger)
  useEffect(() => {
    if (loading) return;
    if (!stats || stats.pendingCount === 0) return;
    if (searchTracking) return; // already polling via search tracker

    const POLL_EVERY_MS = 4000;
    const intervalId = window.setInterval(async () => {
      try {
        const latest = await fetchStats();
        setStats(latest);
        setError(null);
      } catch {
        // transient
      }
    }, POLL_EVERY_MS);
    return () => window.clearInterval(intervalId);
  }, [loading, stats?.pendingCount, searchTracking]);

  const handleSearchQueued = (result: SearchResult) => {
    setToast(null);
    setSearchTracking({
      keyword: result.keyword,
      location: result.location,
      pendingCount: null,
      peakPending: null,
      baselineRaw: stats?.totalRaw ?? 0,
      baselineClean: stats?.totalClean ?? 0,
      baselineProcessed: stats?.totalProcessed ?? 0,
      seenProgress: false,
      startedAt: Date.now(),
    });
  };

  useEffect(() => {
    if (!searchTracking) return;

    const POLL_EVERY_MS = 4000;
    const MAX_POLL_MS = 8 * 60 * 1000;

    const poll = async () => {
      try {
        const latest = await fetchStats();
        setStats(latest);
        setLoading(false);
        setError(null);

        setSearchTracking((prev) => {
          if (!prev) return prev;

          const rawGrew = latest.totalRaw > prev.baselineRaw;
          const cleanGrew = latest.totalClean > prev.baselineClean;
          const processedGrew = latest.totalProcessed > prev.baselineProcessed;
          const pendingNow = latest.pendingCount;
          const peakPending =
            prev.peakPending === null
              ? pendingNow
              : Math.max(prev.peakPending, pendingNow);
          const seenProgress =
            prev.seenProgress || rawGrew || cleanGrew || processedGrew || peakPending > 0;

          // Only mark complete after we actually saw new jobs arrive,
          // then pending classification drained back to 0.
          if (seenProgress && pendingNow === 0 && (rawGrew || cleanGrew || processedGrew || peakPending > 0)) {
            const added = Math.max(
              latest.totalClean - prev.baselineClean,
              latest.totalProcessed - prev.baselineProcessed,
              0,
            );
            setToast(
              added > 0
                ? `Search "${prev.keyword}" in "${prev.location}" completed. ${added} new jobs ready.`
                : `Search "${prev.keyword}" in "${prev.location}" finished. No new matching jobs were added.`,
            );
            setTimeout(() => setToast(null), 6000);
            return null;
          }

          return {
            ...prev,
            pendingCount: pendingNow,
            peakPending,
            seenProgress,
          };
        });

        if (Date.now() - searchTracking.startedAt > MAX_POLL_MS) {
          setSearchTracking(null);
          setToast('Still fetching after several minutes. Check Jobs tab or try again.');
          setTimeout(() => setToast(null), 6000);
        }
      } catch {
        // Keep polling; transient errors should not stop updates.
      }
    };

    poll();
    const intervalId = window.setInterval(poll, POLL_EVERY_MS);
    return () => window.clearInterval(intervalId);
  }, [searchTracking]);

  const wonCount = stats?.feedback?.pipeline?.WON ?? 0;
  const contactedCount = stats?.feedback?.pipeline?.CONTACTED ?? 0;
  const pipelineStages = [
    {
      href: '/companies',
      label: 'Companies',
      hint: 'Intelligence done',
      value: stats?.companyIntelDone ?? 0,
      accent: '#6366f1',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" />
          <path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" />
        </svg>
      ),
    },
    {
      href: '/opportunities',
      label: 'Opportunities',
      hint: 'Qualified',
      value: stats?.qualifiedOpportunities ?? 0,
      accent: '#8b5cf6',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M8 12l2.5 2.5L16 9" />
        </svg>
      ),
    },
    {
      href: '/outreach',
      label: 'Pitches',
      hint: 'Ready to send',
      value: stats?.pitchesReady ?? 0,
      accent: '#0ea5e9',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
    },
    {
      href: '/feedback',
      label: 'Won / contacted',
      hint: `${wonCount} won · ${contactedCount} contacted`,
      value: wonCount + contactedCount,
      accent: '#10b981',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-full">
      {/* ── Page header ─────────────────────────────────── */}
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 45%, #818cf8 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <SectionTitleWithInfo
              title="Dashboard"
              label="Dashboard"
              content={SECTION_INFO.dashboard}
            />
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
            title="Total Jobs"
            value={loading ? '—' : (stats?.totalRaw ?? 0)}
            subtitle="LinkedIn + Europe sources"
            href="/jobs"
            gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            }
          />
          <StatsCard
            title="Clean / Relevant"
            value={loading ? '—' : (stats?.totalClean ?? 0)}
            subtitle="after rule-based filtering"
            href="/jobs"
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
            href="/jobs"
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
            href="/jobs?minConfidence=0.7"
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            }
            badge="Intent signals"
          />
        </div>

        {/* ── Demand pipeline ─────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Demand pipeline</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Companies → Opportunities → Outreach → Feedback
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 divide-y xl:divide-y-0 xl:divide-x divide-slate-100">
            {pipelineStages.map((stage, i) => (
              <a
                key={stage.href}
                href={stage.href}
                className="relative group px-5 py-4 hover:bg-slate-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${stage.accent}14`,
                      color: stage.accent,
                    }}
                  >
                    {stage.icon}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-700">
                    {stage.label}
                  </span>
                  {i < pipelineStages.length - 1 && (
                    <svg
                      className="hidden xl:block ml-auto text-slate-300 group-hover:text-indigo-400 transition-colors"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
                    </svg>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                  {loading ? '—' : stage.value.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 group-hover:text-indigo-600 transition-colors">
                  {stage.hint}
                  <span className="inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <div
                  className="absolute left-0 right-0 bottom-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
                  style={{ background: stage.accent }}
                />
              </a>
            ))}
          </div>
        </div>

        {/* ── Middle row: Search + Domain breakdown ───────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Search form */}
          <div className="xl:col-span-1">
            <SearchForm onSuccess={handleSearchQueued} />

            {searchTracking && (
              <div className="mt-4 bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-2xl text-xs font-medium">
                {searchTracking.seenProgress &&
                searchTracking.pendingCount !== null &&
                searchTracking.peakPending !== null &&
                searchTracking.peakPending > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-indigo-700 mb-1.5">
                      <span>
                        AI classifying &quot;{searchTracking.keyword}&quot; in &quot;{searchTracking.location}&quot; — {searchTracking.pendingCount} remaining
                      </span>
                      <span className="font-semibold">
                        {Math.round(
                          ((searchTracking.peakPending - searchTracking.pendingCount) /
                            searchTracking.peakPending) *
                            100,
                        )}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-indigo-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              ((searchTracking.peakPending - searchTracking.pendingCount) /
                                searchTracking.peakPending) *
                                100,
                            ),
                          )}%`,
                          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    {searchTracking.seenProgress
                      ? `Processing jobs for "${searchTracking.keyword}" in "${searchTracking.location}"…`
                      : `Fetching jobs from Apify for "${searchTracking.keyword}" in "${searchTracking.location}"…`}
                  </div>
                )}
              </div>
            )}

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
                <button
                  key={c.name}
                  onClick={() => router.push(`/jobs?country=${encodeURIComponent(c.name)}`)}
                  className="rounded-xl p-4 text-center cursor-pointer hover:scale-105 hover:shadow-md transition-all"
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
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
