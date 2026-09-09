'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchOpportunities, syncOpportunities } from '@/lib/api';
import type { Opportunity, OpportunityStage } from '@/lib/types';
import { OpportunitiesTable } from '@/components/opportunities/OpportunitiesTable';
import { SectionTitleWithInfo, SECTION_INFO } from '@/components/ui/SectionInfoButton';

const STAGE_FILTERS: Array<OpportunityStage | 'ALL'> = [
  'ALL',
  'QUALIFIED',
  'NURTURE',
  'NEW',
  'REVIEWED',
  'CONTACTED',
  'REPLIED',
  'MEETING',
  'WON',
  'LOST',
  'DISQUALIFIED',
];

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<OpportunityStage | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const res = await fetchOpportunities(
      stageFilter === 'ALL' ? undefined : { stage: stageFilter },
    );
    setOpportunities(res.opportunities);
    setSummary(res.summary);
  }, [stageFilter]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = opportunities.filter(
    (o) =>
      !search ||
      o.companyName.toLowerCase().includes(search.toLowerCase()) ||
      o.country.toLowerCase().includes(search.toLowerCase()) ||
      o.recommendedOffering.toLowerCase().includes(search.toLowerCase()),
  );

  const qualifiedCount = summary.QUALIFIED ?? 0;
  const nurtureCount = summary.NURTURE ?? 0;
  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await syncOpportunities();
      setNotice(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  function handleStageChange(id: string, stage: OpportunityStage) {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, stage } : o)),
    );
  }

  return (
    <div className="min-h-full">
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)' }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <SectionTitleWithInfo
                title="Opportunities"
                label="Opportunities"
                content={SECTION_INFO.opportunities}
              />
            </div>
            <p className="text-indigo-100 text-sm mt-0.5">
              Rank · qualify · stage · recommended offering
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!loading && (
              <>
                <div
                  className="px-4 py-2 rounded-xl text-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <div className="text-lg font-bold text-white">{total}</div>
                  <div className="text-xs text-indigo-100">Total</div>
                </div>
                <div
                  className="px-4 py-2 rounded-xl text-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <div className="text-lg font-bold text-white">{qualifiedCount}</div>
                  <div className="text-xs text-indigo-100">Qualified</div>
                </div>
                <div
                  className="px-4 py-2 rounded-xl text-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <div className="text-lg font-bold text-white">{nurtureCount}</div>
                  <div className="text-xs text-indigo-100">Nurture</div>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || loading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 transition-colors shadow-sm"
            >
              {syncing ? 'Syncing…' : 'Sync from companies'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {STAGE_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStageFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  stageFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}
                {s !== 'ALL' && summary[s] != null ? ` (${summary[s]})` : ''}
              </button>
            ))}
          </div>
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
              placeholder="Search company, country, offering…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {notice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm">
            {notice}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        <OpportunitiesTable
          opportunities={filtered}
          loading={loading}
          onStageChange={handleStageChange}
          onFeedbackRecorded={() => load().catch(() => undefined)}
        />
      </div>
    </div>
  );
}
