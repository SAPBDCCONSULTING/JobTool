'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSources, toggleSource, scrapeSource } from '@/lib/api';
import type { Source } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  QUEUED: 'bg-amber-100 text-amber-700',
  RUNNING: 'bg-indigo-100 text-indigo-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

interface ModalState {
  source: Source;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [keyword, setKeyword] = useState('');
  const [scraping, setScraping] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSources();
      setSources(data.sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const byCountry = new Map<string, Source[]>();
    for (const s of sources) {
      const key = s.type === 'APIFY' ? 'LinkedIn (Apify)' : s.country ?? 'Other';
      if (!byCountry.has(key)) byCountry.set(key, []);
      byCountry.get(key)!.push(s);
    }
    return [...byCountry.entries()].sort(([a], [b]) =>
      a === 'LinkedIn (Apify)' ? -1 : b === 'LinkedIn (Apify)' ? 1 : a.localeCompare(b),
    );
  }, [sources]);

  const enabledCount = sources.filter((s) => s.enabled).length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const handleToggle = async (s: Source) => {
    setToggling(s.id);
    try {
      const { source } = await toggleSource(s.name, !s.enabled);
      setSources((prev) => prev.map((x) => (x.id === s.id ? source : x)));
      showToast(source.enabled ? `${source.name} enabled for scheduled runs` : `${source.name} disabled`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Toggle failed');
    } finally {
      setToggling(null);
    }
  };

  const handleScrape = async () => {
    if (!modal || !keyword.trim()) return;
    setScraping(true);
    try {
      const res = await scrapeSource(modal.source.name, keyword.trim());
      showToast(res.message);
      setModal(null);
      setKeyword('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Scrape failed');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="min-h-full">
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' }}
      >
        <h1 className="text-2xl font-bold text-white">Sources</h1>
        <p className="text-indigo-200 text-sm mt-0.5">
          {sources.length} sources · {enabledCount} enabled for scheduled runs — click a site to scrape now
        </p>
      </div>

      <div className="px-8 py-7">
        {toast && (
          <div className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm font-medium shadow-sm">
            {toast}
            <button onClick={() => setToast(null)} className="ml-auto text-emerald-600">
              ✕
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400 text-sm">
            Loading sources…
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-4">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            {grouped.map(([country, list]) => (
              <div key={country}>
                <h2 className="text-lg font-bold text-slate-800 mb-4">{country}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {list.map((s) => {
                    const lastRun = s.runs?.[0];
                    return (
                      <div
                        key={s.id}
                        className={`bg-white border rounded-xl p-4 transition-all ${
                          s.enabled
                            ? 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                            : 'border-slate-100 opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => {
                              setModal({ source: s });
                              setKeyword('');
                            }}
                            className="text-left flex-1 min-w-0"
                          >
                            <p className="font-medium text-sm text-slate-800 truncate hover:text-indigo-700">
                              {s.website ? s.website.replace(/^https?:\/\//, '') : s.name}
                            </p>
                            {lastRun ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                    STATUS_STYLES[lastRun.status] ?? 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {lastRun.status}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {lastRun.itemsNew} new · {lastRun.itemsDup} dup
                                </span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 mt-1">never run</p>
                            )}
                            {lastRun?.error && (
                              <p className="text-[11px] text-red-500 mt-1 truncate" title={lastRun.error}>
                                {lastRun.error}
                              </p>
                            )}
                          </button>
                          <button
                            onClick={() => handleToggle(s)}
                            disabled={toggling === s.id || s.type === 'APIFY'}
                            title={
                              s.type === 'APIFY'
                                ? 'LinkedIn is always enabled'
                                : s.enabled
                                  ? 'Disable'
                                  : 'Enable'
                            }
                            className={`flex-shrink-0 w-9 rounded-full px-1 py-1 transition-colors ${
                              s.enabled ? 'bg-emerald-400' : 'bg-slate-300'
                            } ${s.type === 'APIFY' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div
                              className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                s.enabled ? 'translate-x-4' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scrape keyword modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Scrape {modal.source.country ?? modal.source.name}
            </h3>
            <p className="text-sm text-slate-500 mb-4">Source: {modal.source.name}</p>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Search keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              placeholder="e.g. SAP, Cloud Engineer, Data Analyst"
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScrape}
                disabled={scraping || !keyword.trim()}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                {scraping ? 'Scraping…' : 'Scrape Jobs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

