'use client';

import { Fragment, useState } from 'react';
import type { FeedbackOutcome, Opportunity, OpportunityStage } from '@/lib/types';
import { ConfidenceBadge, DomainBadge } from '@/components/ui/ConfidenceBadge';
import { recordFeedback, updateOpportunityStage } from '@/lib/api';

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  loading?: boolean;
  onStageChange?: (id: string, stage: OpportunityStage) => void;
  onFeedbackRecorded?: () => void;
}

const STAGE_STYLES: Record<OpportunityStage, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  QUALIFIED: 'bg-emerald-50 text-emerald-700',
  NURTURE: 'bg-amber-50 text-amber-700',
  DISQUALIFIED: 'bg-red-50 text-red-600',
  REVIEWED: 'bg-cyan-50 text-cyan-700',
  CONTACTED: 'bg-blue-50 text-blue-700',
  REPLIED: 'bg-sky-50 text-sky-700',
  MEETING: 'bg-indigo-50 text-indigo-700',
  WON: 'bg-violet-50 text-violet-700',
  LOST: 'bg-slate-200 text-slate-500',
};

const STAGE_OPTIONS: OpportunityStage[] = [
  'NEW',
  'QUALIFIED',
  'NURTURE',
  'DISQUALIFIED',
  'REVIEWED',
  'CONTACTED',
  'REPLIED',
  'MEETING',
  'WON',
  'LOST',
];

const FEEDBACK_OUTCOMES: FeedbackOutcome[] = [
  'REVIEWED',
  'CONTACTED',
  'REPLIED',
  'MEETING',
  'WON',
  'LOST',
];

export function OpportunitiesTable({
  opportunities,
  loading,
  onStageChange,
  onFeedbackRecorded,
}: OpportunitiesTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-0">
              <div className="w-8 h-8 bg-slate-200 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-slate-200 rounded w-1/4" />
                <div className="h-2.5 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <p className="text-slate-500 font-medium">No opportunities yet</p>
        <p className="text-slate-400 text-sm mt-1">
          Run company intelligence, then Sync opportunities
        </p>
      </div>
    );
  }

  async function handleStage(
    e: React.ChangeEvent<HTMLSelectElement>,
    id: string,
  ) {
    e.stopPropagation();
    const stage = e.target.value as OpportunityStage;
    setUpdating(id);
    try {
      await updateOpportunityStage(id, stage);
      onStageChange?.(id, stage);
    } finally {
      setUpdating(null);
    }
  }

  async function handleFeedback(opportunityId: string, outcome: FeedbackOutcome) {
    setSavingFeedback(`${opportunityId}:${outcome}`);
    try {
      const res = await recordFeedback({
        opportunityId,
        outcome,
        notes: notesDraft[opportunityId],
      });
      onStageChange?.(opportunityId, res.stage);
      onFeedbackRecorded?.();
    } finally {
      setSavingFeedback(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rank</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Country</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recommended offering</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Domain</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {opportunities.map((opp) => {
              const isOpen = expanded === opp.id;
              return (
                <Fragment key={opp.id}>
                  <tr
                    className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : opp.id)}
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                        {opp.rank || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{
                            background: `hsl(${(opp.companyName.charCodeAt(0) * 47) % 360}, 65%, 50%)`,
                          }}
                        >
                          {opp.companyName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{opp.companyName}</p>
                          <p className="text-xs text-slate-400">{opp.jobCount} jobs</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{opp.country}</td>
                    <td className="px-4 py-4">
                      <ConfidenceBadge value={opp.score} showBar />
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={opp.stage}
                        disabled={updating === opp.id}
                        onChange={(e) => handleStage(e, opp.id)}
                        className={`text-xs font-semibold rounded-lg border-0 px-2.5 py-1.5 cursor-pointer focus:ring-2 focus:ring-indigo-300 ${STAGE_STYLES[opp.stage]}`}
                      >
                        {STAGE_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-700 max-w-xs leading-snug">
                        {opp.recommendedOffering}
                      </p>
                      {opp.offeringCode && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{opp.offeringCode}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <DomainBadge domain={opp.topDomain} />
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                              Why now
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {opp.whyNow || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                              Qualification
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {opp.qualificationReason || '—'}
                            </p>
                          </div>
                          {opp.signals.length > 0 && (
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                Signals
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {opp.signals.map((s) => (
                                  <span
                                    key={s}
                                    className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="md:col-span-2 border-t border-slate-200 pt-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                              Feedback loop
                            </p>
                            {opp.latestFeedback && (
                              <p className="text-xs text-slate-500 mb-2">
                                Latest: <span className="font-semibold text-slate-700">{opp.latestFeedback.outcome}</span>
                                {' · '}
                                {new Date(opp.latestFeedback.createdAt).toLocaleString()}
                                {opp.latestFeedback.notes ? ` — ${opp.latestFeedback.notes}` : ''}
                              </p>
                            )}
                            <textarea
                              value={notesDraft[opp.id] ?? ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setNotesDraft((prev) => ({ ...prev, [opp.id]: e.target.value }))
                              }
                              placeholder="Optional notes (call result, next step…)"
                              rows={2}
                              className="w-full mb-2 text-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                            <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                              {FEEDBACK_OUTCOMES.map((outcome) => (
                                <button
                                  key={outcome}
                                  type="button"
                                  disabled={savingFeedback?.startsWith(opp.id)}
                                  onClick={() => handleFeedback(opp.id, outcome)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
                                    opp.latestFeedback?.outcome === outcome || opp.stage === outcome
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
                                  }`}
                                >
                                  {savingFeedback === `${opp.id}:${outcome}` ? '…' : outcome}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
