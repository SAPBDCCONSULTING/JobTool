'use client';

import { useState } from 'react';
import type { Pitch } from '@/lib/types';
import { ConfidenceBadge, DomainBadge } from '@/components/ui/ConfidenceBadge';
import { regeneratePitch } from '@/lib/api';

interface PitchesPanelProps {
  pitches: Pitch[];
  loading?: boolean;
  onRegenerated?: () => void;
}

export function PitchesPanel({ pitches, loading, onRegenerated }: PitchesPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenId, setRegenId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (pitches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <p className="text-slate-500 font-medium">No pitches yet</p>
        <p className="text-slate-400 text-sm mt-1">
          Generate pitches from qualified opportunities
        </p>
      </div>
    );
  }

  const selected = pitches.find((p) => p.id === selectedId) ?? pitches[0];

  async function copyEmail() {
    if (!selected.emailSubject && !selected.emailBody) return;
    const text = `Subject: ${selected.emailSubject || ''}\n\n${selected.emailBody || ''}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegen(id: string) {
    setRegenId(id);
    try {
      await regeneratePitch(id);
      onRegenerated?.();
    } finally {
      setRegenId(null);
    }
  }

  return (
    <div className="grid lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-h-[70vh] overflow-y-auto">
        <ul className="divide-y divide-slate-100">
          {pitches.map((p) => {
            const active = (selectedId ?? pitches[0]?.id) === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left px-4 py-3.5 transition-colors ${
                    active ? 'bg-violet-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{p.companyName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.country}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        p.aiStatus === 'DONE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : p.aiStatus === 'FAILED'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {p.aiStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-1">
                    {p.emailSubject || 'Generating…'}
                  </p>
                  {(p.contactEmails?.length ?? 0) > 0 && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium truncate">
                      {p.contactEmails![0]}
                      {p.contactEmails!.length > 1 ? ` +${p.contactEmails!.length - 1}` : ''}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{selected.companyName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {selected.country} · Rank #{selected.opportunity.rank || '—'} ·{' '}
              {selected.opportunity.stage}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(selected.contactEmails?.length ?? 0) > 0 && (
              <a
                href={`mailto:${selected.contactEmails![0]}?subject=${encodeURIComponent(selected.emailSubject || '')}&body=${encodeURIComponent(selected.emailBody || '')}`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500"
              >
                Open mailto
              </a>
            )}
            <button
              type="button"
              onClick={copyEmail}
              disabled={selected.aiStatus !== 'DONE'}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {copied ? 'Copied' : 'Copy email'}
            </button>
            <button
              type="button"
              onClick={() => handleRegen(selected.id)}
              disabled={regenId === selected.id}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {regenId === selected.id ? 'Queuing…' : 'Regenerate'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <ConfidenceBadge value={selected.opportunity.score} showBar />
          <DomainBadge domain={selected.opportunity.topDomain} />
          <span className="text-xs text-slate-500">
            {selected.opportunity.recommendedOffering}
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Contact emails from jobs
          </p>
          {(selected.contactEmails?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selected.contactEmails!.map((email) => (
                <a
                  key={email}
                  href={`mailto:${email}?subject=${encodeURIComponent(selected.emailSubject || '')}&body=${encodeURIComponent(selected.emailBody || '')}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {email}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              No email found in job postings for this company. Use job board apply links or LinkedIn.
            </p>
          )}
        </div>

        {selected.angles.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Pitch angles
            </p>
            <ul className="space-y-1.5">
              {selected.angles.map((a) => (
                <li
                  key={a}
                  className="text-sm text-slate-700 bg-violet-50/60 border border-violet-100 rounded-xl px-3 py-2"
                >
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Email
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              Subject: {selected.emailSubject || '—'}
            </p>
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              {selected.emailBody || 'Pitch is still generating…'}
            </pre>
            {selected.callToAction && (
              <p className="text-xs font-medium text-violet-700 pt-2 border-t border-slate-200">
                CTA: {selected.callToAction}
              </p>
            )}
          </div>
        </div>

        {selected.personalizationNotes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Personalization notes
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              {selected.personalizationNotes}
            </p>
          </div>
        )}

        {selected.opportunity.whyNow && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Why now (from opportunity)
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              {selected.opportunity.whyNow}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
