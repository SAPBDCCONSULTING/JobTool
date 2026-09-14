'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchKeywords,
  createKeyword,
  updateKeyword,
  deleteKeyword,
  triggerKeywordRun,
} from '@/lib/api';
import type { Keyword } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-amber-100 text-amber-700',
  RUNNING: 'bg-indigo-100 text-indigo-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newHours, setNewHours] = useState('6');
  const [runningId, setRunningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchKeywords();
      setKeywords(data.keywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load keywords');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleAdd = async () => {
    if (!newTerm.trim()) return;
    setAdding(true);
    try {
      const { keyword } = await createKeyword({
        term: newTerm.trim(),
        location: newLocation.trim() || undefined,
        scheduleHours: Math.max(1, parseInt(newHours) || 6),
      });
      setKeywords((prev) => [keyword, ...prev]);
      setNewTerm('');
      setNewLocation('');
      setNewHours('6');
      showToast(`Added keyword "${keyword.term}"`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add keyword');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (k: Keyword) => {
    try {
      const { keyword } = await updateKeyword(k.id, { enabled: !k.enabled });
      setKeywords((prev) => prev.map((x) => (x.id === k.id ? keyword : x)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleRun = async (k: Keyword) => {
    setRunningId(k.id);
    try {
      const { created } = await triggerKeywordRun(k.id);
      showToast(created > 0 ? `Queued ${created} fetch(es) for "${k.term}"` : `"${k.term}" already running`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Trigger failed');
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (k: Keyword) => {
    if (!window.confirm(`Delete keyword "${k.term}"?`)) return;
    try {
      await deleteKeyword(k.id);
      setKeywords((prev) => prev.filter((x) => x.id !== k.id));
      showToast(`Deleted "${k.term}"`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-full">
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' }}
      >
        <h1 className="text-2xl font-bold text-white">Keywords</h1>
        <p className="text-indigo-200 text-sm mt-0.5">
          What the platform searches for on LinkedIn + European job sites
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

        {/* Add keyword */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-slate-700 text-sm mb-4">Add keyword</h3>
          <div className="flex flex-wrap gap-3">
            <input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. SAP, SAC, S/4HANA"
              className="flex-1 min-w-40 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="LinkedIn location (optional)"
              className="flex-1 min-w-40 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <input
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
              type="number"
              min={1}
              max={168}
              title="Fetch every N hours"
              className="w-20 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newTerm.trim()}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              {adding ? 'Adding…' : '+ Add'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Every enabled keyword is fetched from every enabled source on its schedule (default 6h).
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400 text-sm">
            Loading keywords…
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-4">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {keywords.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                No keywords yet. Add one above to start automatic job discovery.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="px-6 py-3 font-semibold">Keyword</th>
                    <th className="px-6 py-3 font-semibold">Location</th>
                    <th className="px-6 py-3 font-semibold">Schedule</th>
                    <th className="px-6 py-3 font-semibold">Last run</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {keywords.map((k) => {
                    const lastRun = k.runs?.[0];
                    return (
                      <tr key={k.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggle(k)}
                              title={k.enabled ? 'Disable' : 'Enable'}
                              className={`w-9 rounded-full px-1 py-1 transition-colors ${
                                k.enabled ? 'bg-emerald-400' : 'bg-slate-300'
                              }`}
                            >
                              <div
                                className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                  k.enabled ? 'translate-x-4' : ''
                                }`}
                              />
                            </button>
                            <div>
                              <p className="font-semibold text-slate-800">{k.term}</p>
                              {k.category && <p className="text-xs text-slate-400">{k.category}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{k.location || '—'}</td>
                        <td className="px-6 py-4 text-slate-600">every {k.scheduleHours}h</td>
                        <td className="px-6 py-4">
                          {lastRun ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  STATUS_COLORS[lastRun.status] ?? 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {lastRun.status}
                              </span>
                              <span className="text-xs text-slate-400">
                                {lastRun.itemsNew} new · {lastRun.itemsDup} dup
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">never run</span>
                          )}
                          {lastRun?.error && (
                            <p className="text-xs text-red-500 mt-1 truncate max-w-56" title={lastRun.error}>
                              {lastRun.error}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRun(k)}
                              disabled={runningId === k.id || !k.enabled}
                              title={k.enabled ? 'Run now' : 'Enable to run'}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {runningId === k.id ? '…' : 'Run now'}
                            </button>
                            <button
                              onClick={() => handleDelete(k)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

