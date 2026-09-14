'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchOutreach, updateOutreach, deleteOutreach } from '@/lib/api';
import type { OutreachEmail } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
};

export default function OutreachPage() {
  const [emails, setEmails] = useState<OutreachEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchOutreach();
      setEmails(res.emails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load outreach emails');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const startEdit = (e: OutreachEmail) => {
    setEditingId(e.id);
    setEditSubject(e.subject);
    setEditBody(e.body);
  };

  const saveEdit = async (e: OutreachEmail) => {
    try {
      const { email } = await updateOutreach(e.id, { subject: editSubject, body: editBody });
      setEmails((prev) => prev.map((x) => (x.id === e.id ? email : x)));
      setEditingId(null);
      showToast('Draft updated');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const setStatus = async (e: OutreachEmail, status: 'draft' | 'sent' | 'done') => {
    try {
      const { email } = await updateOutreach(e.id, { status });
      setEmails((prev) => prev.map((x) => (x.id === e.id ? email : x)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const copyBody = async (e: OutreachEmail) => {
    await navigator.clipboard.writeText(`Subject: ${e.subject}\n\n${e.body}`);
    showToast('Copied to clipboard');
  };

  const remove = async (e: OutreachEmail) => {
    if (!window.confirm('Delete this draft?')) return;
    try {
      await deleteOutreach(e.id);
      setEmails((prev) => prev.filter((x) => x.id !== e.id));
      showToast('Draft deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-full">
      <div
        className="px-8 py-6 border-b border-slate-200/60"
        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' }}
      >
        <h1 className="text-2xl font-bold text-white">Outreach Emails</h1>
        <p className="text-amber-100 text-sm mt-0.5">
          AI-generated drafts for companies showing strong hiring signals
        </p>
      </div>

      <div className="px-8 py-7">
        {toast && (
          <div className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm font-medium shadow-sm">
            {toast}
            <button onClick={() => setToast(null)} className="ml-auto text-emerald-600">✕</button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400 text-sm">
            Loading drafts…
          </div>
        ) : emails.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <p className="text-slate-500 font-medium">No outreach drafts yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Generate one from a <Link href="/companies" className="text-indigo-600 hover:underline">company</Link> page.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {emails.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    {editingId === e.id ? (
                      <input
                        value={editSubject}
                        onChange={(ev) => setEditSubject(ev.target.value)}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
                      />
                    ) : (
                      <p className="font-semibold text-slate-800">{e.subject}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {e.company.name}
                      {e.company.country ? ` · ${e.company.country}` : ''} ·{' '}
                      {new Date(e.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[e.status]}`}>
                    {e.status}
                  </span>
                </div>

                {editingId === e.id ? (
                  <textarea
                    value={editBody}
                    onChange={(ev) => setEditBody(ev.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 leading-relaxed"
                  />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-line">{e.body}</p>
                )}

                <div className="flex items-center gap-2 mt-4">
                  {editingId === e.id ? (
                    <>
                      <button onClick={() => saveEdit(e)} className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 rounded-lg border border-slate-200">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(e)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                        Edit
                      </button>
                      <button onClick={() => copyBody(e)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                        Copy
                      </button>
                      {e.status !== 'sent' && (
                        <button onClick={() => setStatus(e, 'sent')} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">
                          Mark sent
                        </button>
                      )}
                      {e.status !== 'done' && (
                        <button onClick={() => setStatus(e, 'done')} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                          Mark done
                        </button>
                      )}
                      <button onClick={() => remove(e)} className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}