'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchCompany, recalculateCompany, generateOutreach } from '@/lib/api';
import type { CompanyDetail, OutreachEmail } from '@/lib/types';

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-slate-400';
}

function BreakdownBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-500 capitalize">{label}</span>
        <span className="text-slate-400">
          {Math.round(value)} · {weight}%
        </span>
      </div>
      <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export default function CompanyDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [data, setData] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalcing, setRecalcing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<OutreachEmail | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchCompany(id);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleRecalc = async () => {
    setRecalcing(true);
    try {
      const res = await recalculateCompany(id);
      showToast(res.message);
      setTimeout(load, 4000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Recalculate failed');
    } finally {
      setRecalcing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { email } = await generateOutreach(id);
      setDraft(email);
      showToast('Outreach draft generated');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-sm text-slate-400">
        Loading company…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-full px-8 py-16 text-center">
        <p className="text-red-500 font-medium">{error ?? 'Company not found'}</p>
        <Link href="/companies" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">
          ← Back to companies
        </Link>
      </div>
    );
  }

  const { company, intelligence, jobs } = data;
  const score = intelligence?.score ?? null;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <Link href="/companies" className="text-indigo-200 text-xs hover:text-white mb-2 inline-block">
              ← Companies
            </Link>
            <h1 className="text-2xl font-bold text-white">{company.name}</h1>
            <p className="text-indigo-200 text-sm mt-0.5">
              {company.country ?? 'Unknown location'}
              {company.aliases.length > 0 && (
                <span className="text-indigo-300"> · a.k.a. {company.aliases.join(', ')}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {score !== null && (
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white text-xl font-bold ${scoreColor(score)}`}>
                  {Math.round(score)}
                </div>
                <div className="text-xs text-indigo-200 mt-1">Opportunity</div>
              </div>
            )}
            <button
              onClick={handleRecalc}
              disabled={recalcing}
              className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-white rounded-xl shadow-sm hover:bg-indigo-50 disabled:opacity-60"
            >
              {recalcing ? 'Recalculating…' : '↻ Recalculate'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-7">
        {toast && (
          <div className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm font-medium shadow-sm">
            {toast}
            <button onClick={() => setToast(null)} className="ml-auto text-emerald-600">✕</button>
          </div>
        )}

        {/* Overview + Why */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Opportunity Score</h3>
            {intelligence?.scoreBreakdown ? (
              <div className="space-y-4">
                <BreakdownBar label="relevance" value={intelligence.scoreBreakdown.relevance?.value ?? 0} weight={intelligence.scoreBreakdown.relevance?.weight ?? 0} />
                <BreakdownBar label="volume" value={intelligence.scoreBreakdown.volume?.value ?? 0} weight={intelligence.scoreBreakdown.volume?.weight ?? 0} />
                <BreakdownBar label="velocity" value={intelligence.scoreBreakdown.velocity?.value ?? 0} weight={intelligence.scoreBreakdown.velocity?.weight ?? 0} />
                <BreakdownBar label="outsourcing" value={intelligence.scoreBreakdown.outsourcing?.value ?? 0} weight={intelligence.scoreBreakdown.outsourcing?.weight ?? 0} />
                {intelligence.formulaVersion && (
                  <p className="text-[11px] text-slate-400">formula {intelligence.formulaVersion}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Not scored yet</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Likely Initiative</h3>
            {intelligence?.likelyInitiative ? (
              <>
                <p className="text-lg font-semibold text-slate-800">{intelligence.likelyInitiative}</p>
                {intelligence.summary && (
                  <p className="text-sm text-slate-600 mt-3 leading-relaxed">{intelligence.summary}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">Analyzing…</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Recommended Services</h3>
            {intelligence?.recommendedServices?.length ? (
              <ul className="space-y-2">
                {intelligence.recommendedServices.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 italic">No recommendations yet</p>
            )}
          </div>
        </div>

        {/* Why this company */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Why This Company</h3>
            {intelligence?.evidence?.length || intelligence?.scoreExplanation ? (
              <ul className="space-y-2.5">
                {intelligence.scoreExplanation && (
                  <li className="text-sm text-slate-600 flex gap-2">
                    <span className="text-indigo-500">•</span>
                    {intelligence.scoreExplanation}
                  </li>
                )}
                {intelligence.evidence.map((e, i) => (
                  <li key={i} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-indigo-500">•</span>
                    {e}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 italic">No evidence yet</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-700 text-sm mb-4">Technology Breakdown</h3>
            {intelligence?.topTechnologies?.length ? (
              <div className="flex flex-wrap gap-2">
                {intelligence.topTechnologies.map((t) => (
                  <span key={t} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No technologies detected</p>
            )}

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-xl font-bold text-slate-800">{intelligence?.activeJobs ?? 0}</div>
                <div className="text-xs text-slate-400">Active jobs</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-xl font-bold text-slate-800">{intelligence?.jobs7d ?? 0}</div>
                <div className="text-xs text-slate-400">Last 7 days</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-xl font-bold text-slate-800">{intelligence?.jobs30d ?? 0}</div>
                <div className="text-xs text-slate-400">Last 30 days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Outreach */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 text-sm">Outreach</h3>
            <div className="flex gap-2">
              <Link
                href="/outreach"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                View all drafts
              </Link>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                {generating ? 'Generating…' : 'Generate Outreach Email'}
              </button>
            </div>
          </div>
          {draft ? (
            <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-5">
              <p className="font-semibold text-slate-800 text-sm mb-2">{draft.subject}</p>
              <p className="text-sm text-slate-600 whitespace-pre-line">{draft.body}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">
              Generate a personalized outreach email from this company&apos;s intelligence.
            </p>
          )}
        </div>

        {/* Job activity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
          <h3 className="font-semibold text-slate-700 text-sm px-6 py-4 border-b border-slate-100">
            Job Activity ({jobs.length})
          </h3>
          {jobs.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              No analyzed jobs yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {jobs.map((j) => (
                <li key={j.id} className="px-6 py-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {j.jobTitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {j.relevanceScore != null && (
                          <span className="text-[11px] font-semibold text-indigo-600">
                            relevance {j.relevanceScore}
                          </span>
                        )}
                        {j.seniority && (
                          <span className="text-[11px] text-slate-400 capitalize">{j.seniority}</span>
                        )}
                        {j.projectType && (
                          <span className="text-[11px] text-slate-400 capitalize">{j.projectType}</span>
                        )}
                        {j.outsourcingPotential != null && (
                          <span className="text-[11px] text-slate-400">
                            outsourcing {Math.round(j.outsourcingPotential * 100)}%
                          </span>
                        )}
                        {j.occurrences > 1 && (
                          <span className="text-[11px] text-amber-600">{j.occurrences} sources</span>
                        )}
                      </div>
                      {j.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {j.technologies.slice(0, 6).map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {j.url && (
                      <a
                        href={j.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:underline flex-shrink-0"
                      >
                        View ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
