'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchRuns, retryRun, triggerAllRuns } from '@/lib/api';
import type { Run } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  QUEUED: 'bg-amber-100 text-amber-700 border-amber-200',
  RUNNING: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  SUCCESS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
};

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p: number) => {
    try {
      setError(null);
      const data = await fetchRuns({ page: p, limit: 25 });
      setRuns(data.runs);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
    const interval = window.setInterval(() => load(page), 10000);
    return () => window.clearInterval(interval);
  }, [load, page]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleTriggerAll = async () => {
    setBusy(true);
    try {
      const { created } = await triggerAllRuns();
      showToast(created > 0 ? `Queued ${created} runs across all enabled keywords & sources` : 'All runs already queued/running');
      await load(1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Trigger failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRetry = async (r: Run) => {
    try {
      await retryRun(r.id);
      showToast(`Re-queued run for ${r.source.name} × ${r.keyword?.term ?? '?'}`);
      await load(page);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Retry failed');
    }
  };

  return (
    <div className="min-h-full">
      <div
        className="px-8 py-6 border-b border-slate-200/60 flex items-end justify-between"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' }}
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Source Runs</h1>
          <p className="text-indigo-200 text-sm mt-0.5">
            Every fetch across LinkedIn + European job sites — {total} total
          </p>
        </div>
        <button
          onClick={handleTriggerAll}
          disabled={busy}
          className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-white rounded-xl shadow-sm hover:bg-indigo-50 disabled:opacity-60"
        >
          {busy ? 'Triggering…' : '▶ Run all now'}
        </button>
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400 text-sm">
            Loading runs…
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {runs.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                No runs yet. Add keywords and click &quot;Run all now&quot;.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="px-6 py-3 font-semibold">Source</th>
                    <th className="px-6 py-3 font-semibold">Keyword</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Results</th>
                    <th className="px-6 py-3 font-semibold">Started</th>
                    <th className="px-6 py-3 font-semibold">Finished</th>
                    <th className="px-6 py-3 font-semibold text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors align-top">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{r.source.name}</p>
                        <p className="text-xs text-slate-400">
                          {r.source.type === 'APIFY' ? 'LinkedIn · Apify' : r.source.country}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{r.keyword?.term ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {r.status}
                        </span>
                        {r.error && (
                          <p className="text-xs text-red-500 mt-1 max-w-56" title={r.error}>
                            {r.error.length > 80 ? `${r.error.slice(0, 80)}…` : r.error}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-500 space-y-0.5">
                          <p>
                            <span className="font-semibold text-slate-700">{r.itemsFetched}</span> fetched
                          </p>
                          <p>
                            <span className="text-emerald-600 font-medium">{r.itemsNew}</span> new ·{' '}
                            <span className="text-amber-600 font-medium">{r.itemsDup}</span> dup ·{' '}
                            <span className="text-slate-500 font-medium">{r.itemsFiltered}</span> filtered
                            {r.itemsFailed > 0 && (
                              <>
                                {' · '}
                                <span className="text-red-500 font-medium">{r.itemsFailed}</span> failed
                              </>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{fmtTime(r.startedAt)}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{fmtTime(r.finishedAt)}</td>
                      <td className="px-6 py-4 text-right">
                        {(r.status === 'FAILED' || r.status === 'SUCCESS') && (
                          <button
                            onClick={() => handleRetry(r)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                          >
                            Re-run
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-sm">
                <span className="text-xs text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

