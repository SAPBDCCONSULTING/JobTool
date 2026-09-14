'use client';

import { useEffect, useState } from 'react';
import type { JobDetail } from '@/lib/types';
import { fetchJobDetail } from '@/lib/api';
import { RelevanceBadge, StatusBadge, DomainBadge } from '@/components/ui/RelevanceBadge';

interface JobDetailDrawerProps {
  jobId: string | null;
  onClose: () => void;
}

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/** Slide-over panel with the full job posting, AI analysis and occurrences. */
export function JobDetailDrawer({ jobId, onClose }: JobDetailDrawerProps) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchJobDetail(jobId)
      .then((data) => {
        if (!cancelled) setJob(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load job');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 flex items-start gap-3 z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800 leading-tight">
              {job?.jobTitle ?? (loading ? 'Loading…' : '')}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {job?.companyName}
              {job?.country ? ` · ${job.country}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {loading && (
          <div className="px-6 py-16 text-center text-sm text-slate-400">Loading job details…</div>
        )}

        {error && (
          <div className="m-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {job && (
          <div className="px-6 py-5 space-y-6">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <DomainBadge domain={job.domain} />
              <StatusBadge status={job.aiStatus} />
              <RelevanceBadge value={job.relevanceScore} showBar />
              {job.technologies.slice(0, 6).map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                  {t}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {job.jobUrl && (
                <a
                  href={job.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  View &amp; Apply ↗
                </a>
              )}
              {job.company && (
                <a
                  href={`/companies/${job.company.id}`}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Company intelligence →
                </a>
              )}
              {!job.jobUrl && (
                <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-sm italic">
                  No application link captured for this posting
                </span>
              )}
            </div>
            {/* AI analysis */}
            {(job.summary || job.aiReason) && (
              <section className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-2">AI Analysis</h3>
                {job.summary && <p className="text-sm text-slate-700 leading-relaxed">{job.summary}</p>}
                {job.aiReason && (
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    <span className="font-semibold text-slate-600">Why: </span>
                    {job.aiReason}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-slate-500">
                  {job.roleCategory && <span>Role: <b className="text-slate-700">{job.roleCategory}</b></span>}
                  {job.seniority && <span>Seniority: <b className="text-slate-700">{job.seniority}</b></span>}
                  {job.projectType && <span>Project: <b className="text-slate-700">{job.projectType}</b></span>}
                  {job.outsourcingPotential != null && (
                    <span>Outsourcing: <b className="text-slate-700">{Math.round(job.outsourcingPotential * 100)}%</b></span>
                  )}
                </div>
              </section>
            )}

            {/* Description */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Job Description</h3>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-100 rounded-2xl p-4 max-h-96 overflow-y-auto">
                {job.jobDescription || 'No description captured.'}
              </div>
            </section>

            {/* Occurrences */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Seen on {job.occurrences.length} source{job.occurrences.length === 1 ? '' : 's'}
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {job.occurrences.map((o) => (
                  <div key={o.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                    <span className="font-medium text-slate-700 w-44 truncate" title={o.source}>{o.source}</span>
                    <span className="text-slate-500 text-xs flex-1">
                      {o.keyword && (
                        <span className="mr-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px]">{o.keyword}</span>
                      )}
                      seen {fmtDate(o.seenAt)}
                      {o.publishedAt ? ` · published ${fmtDate(o.publishedAt)}` : ''}
                    </span>
                    {o.url && (
                      <a href={o.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs font-medium">
                        Open ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <p className="text-xs text-slate-400 pb-4">First discovered {fmtDate(job.createdAt)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
