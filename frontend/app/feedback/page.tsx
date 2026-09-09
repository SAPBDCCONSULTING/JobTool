'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchFeedback } from '@/lib/api';
import type { FeedbackEvent, FeedbackOutcome } from '@/lib/types';
import { SectionTitleWithInfo, SECTION_INFO } from '@/components/ui/SectionInfoButton';

const OUTCOMES: FeedbackOutcome[] = [
  'REVIEWED',
  'CONTACTED',
  'REPLIED',
  'MEETING',
  'WON',
  'LOST',
];

const OUTCOME_COLORS: Record<FeedbackOutcome, string> = {
  REVIEWED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  CONTACTED: 'bg-blue-50 text-blue-700 border-blue-200',
  REPLIED: 'bg-sky-50 text-sky-700 border-sky-200',
  MEETING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  WON: 'bg-violet-50 text-violet-700 border-violet-200',
  LOST: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function FeedbackPage() {
  const [events, setEvents] = useState<FeedbackEvent[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedbackOutcome | 'ALL'>('ALL');

  const load = useCallback(async () => {
    const res = await fetchFeedback(
      filter === 'ALL' ? undefined : { outcome: filter },
    );
    setEvents(res.events);
    setSummary(res.summary);
    setPipeline(res.pipeline);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [load]);

  const totalEvents = Object.values(summary).reduce((a, b) => a + b, 0);
  const won = pipeline.WON ?? summary.WON ?? 0;
  const lost = pipeline.LOST ?? summary.LOST ?? 0;

  return (
    <div className="min-h-full">
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)' }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <SectionTitleWithInfo
                title="Feedback"
                label="Feedback"
                content={SECTION_INFO.feedback}
              />
            </div>
            <p className="text-teal-100 text-sm mt-0.5">
              Reviewed · contacted · replied · meeting · won/lost
            </p>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="text-lg font-bold text-white">{totalEvents}</div>
              <div className="text-xs text-teal-100">Events</div>
            </div>
            <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="text-lg font-bold text-white">{won}</div>
              <div className="text-xs text-teal-100">Won</div>
            </div>
            <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="text-lg font-bold text-white">{lost}</div>
              <div className="text-xs text-teal-100">Lost</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Current pipeline (opportunities)
          </p>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <div
                key={o}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold ${OUTCOME_COLORS[o]}`}
              >
                {o}
                <span className="ml-1.5 opacity-80">{pipeline[o] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filter === 'ALL' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              ALL
            </button>
            {OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setFilter(o)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  filter === o ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {o}
                {summary[o] != null ? ` (${summary[o]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <p className="text-slate-500 font-medium">No feedback yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Expand an opportunity and log REVIEWED / CONTACTED / … outcomes
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {events.map((e) => (
                <li key={e.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">
                      {e.opportunity?.companyName ?? e.opportunityId}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {e.opportunity?.country}
                      {e.opportunity?.recommendedOffering
                        ? ` · ${e.opportunity.recommendedOffering}`
                        : ''}
                    </p>
                    {e.notes && (
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{e.notes}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-2">
                      {new Date(e.createdAt).toLocaleString()}
                      {e.recordedBy ? ` · ${e.recordedBy}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg border ${OUTCOME_COLORS[e.outcome]}`}>
                    {e.outcome}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
