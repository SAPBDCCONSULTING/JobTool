'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchPitches, triggerPitchGeneration } from '@/lib/api';
import type { Pitch } from '@/lib/types';
import { PitchesPanel } from '@/components/outreach/PitchesPanel';
import { SectionTitleWithInfo, SECTION_INFO } from '@/components/ui/SectionInfoButton';

export default function OutreachPage() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    return fetchPitches()
      .then((res) => {
        setPitches(res.pitches);
        setSummary(res.summary);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const pending = pitches.some(
      (p) => p.aiStatus === 'PENDING' || p.aiStatus === 'PROCESSING',
    );
    if (!pending || loading) return;
    const t = setInterval(() => {
      load().catch(() => undefined);
    }, 8000);
    return () => clearInterval(t);
  }, [pitches, loading, load]);

  const filtered = pitches.filter(
    (p) =>
      !search ||
      p.companyName.toLowerCase().includes(search.toLowerCase()) ||
      p.country.toLowerCase().includes(search.toLowerCase()) ||
      (p.emailSubject ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const done = summary.DONE ?? 0;
  const pending = (summary.PENDING ?? 0) + (summary.PROCESSING ?? 0);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await triggerPitchGeneration();
      setNotice(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue generation');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-full">
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <SectionTitleWithInfo
              title="Outreach"
              label="Outreach"
              content={SECTION_INFO.outreach}
            />
            <p className="text-fuchsia-100 text-sm mt-0.5">
              AI pitch angles · personalized email · CTA
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!loading && (
              <>
                <div
                  className="px-4 py-2 rounded-xl text-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <div className="text-lg font-bold text-white">{done}</div>
                  <div className="text-xs text-fuchsia-100">Ready</div>
                </div>
                <div
                  className="px-4 py-2 rounded-xl text-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <div className="text-lg font-bold text-white">{pending}</div>
                  <div className="text-xs text-fuchsia-100">Pending</div>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || loading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-violet-700 hover:bg-violet-50 disabled:opacity-60 transition-colors shadow-sm"
            >
              {generating ? 'Queuing…' : 'Generate pitches'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
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
              placeholder="Search company, country, subject…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition-all"
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

        <PitchesPanel
          pitches={filtered}
          loading={loading}
          onRegenerated={() => load()}
        />
      </div>
    </div>
  );
}
