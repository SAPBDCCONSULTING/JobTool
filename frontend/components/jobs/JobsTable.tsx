'use client';

import { useState } from 'react';
import type { Job } from '@/lib/types';
import { RelevanceBadge, StatusBadge, DomainBadge } from '@/components/ui/RelevanceBadge';
import { JobDetailDrawer } from '@/components/jobs/JobDetailDrawer';

interface JobsTableProps {
  jobs: Job[];
  loading?: boolean;
}

export function JobsTable({ jobs, loading }: JobsTableProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-0">
              <div className="h-3 bg-slate-200 rounded w-1/4" />
              <div className="h-3 bg-slate-200 rounded w-1/5" />
              <div className="h-3 bg-slate-200 rounded w-1/6" />
              <div className="h-5 bg-slate-200 rounded-full w-16" />
              <div className="h-5 bg-slate-200 rounded-full w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">No jobs found</p>
        <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or trigger a new search</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Job Title
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Company
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Location
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Domain
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Relevance
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="hover:bg-indigo-50/30 transition-colors group"
              >
                <td className="px-6 py-4">
                  <button
                    onClick={() => setSelectedJobId(job.id)}
                    className="text-left font-medium text-indigo-700 hover:text-indigo-800 hover:underline text-sm leading-tight max-w-[280px] inline-block"
                    title="View job details"
                  >
                    {job.jobTitle}
                  </button>
                  {job.aiReason && (
                    <div
                      className="text-xs text-slate-400 mt-1 max-w-[280px] truncate opacity-0 group-hover:opacity-100 transition-opacity"
                      title={job.aiReason}
                    >
                      {job.aiReason}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  {job.companyUrl ? (
                    <a
                      href={job.companyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-slate-700 hover:text-indigo-700 hover:underline"
                    >
                      {job.companyName}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-slate-700">{job.companyName}</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-slate-600">{job.country}</span>
                  {job.location && job.location !== job.country && (
                    <div className="text-xs text-slate-400 truncate max-w-[120px]" title={job.location}>
                      {job.location}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <DomainBadge domain={job.domain} />
                </td>
                <td className="px-4 py-4">
                  <RelevanceBadge value={job.relevanceScore} showBar />
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={job.aiStatus} />
                </td>
                <td className="px-4 py-4">
                  <span className="text-xs text-slate-500">
                    {new Date(job.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <JobDetailDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </div>
  );
}
