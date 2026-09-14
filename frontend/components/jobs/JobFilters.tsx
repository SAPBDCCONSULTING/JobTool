'use client';

import { useState } from 'react';
import type { JobFilters, AiStatus } from '@/lib/types';

interface JobFiltersProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}

const DOMAINS = ['SAP', 'ERP', 'Cloud', 'Data & Analytics'];
const STATUS_OPTIONS: { value: AiStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'DONE', label: 'Classified' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'FAILED', label: 'Failed' },
];

export function JobFiltersBar({ filters, onChange }: JobFiltersProps) {
  const [relevanceDisplay, setRelevanceDisplay] = useState(filters.minRelevance ?? 0);

  const update = (patch: Partial<JobFilters>) => onChange({ ...filters, ...patch, page: 1 });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Company search */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Company</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={filters.companyName ?? ''}
              onChange={(e) => update({ companyName: e.target.value || undefined })}
              placeholder="Search company…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Domain */}
        <div className="min-w-[150px]">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Domain</label>
          <select
            value={filters.domain ?? ''}
            onChange={(e) => update({ domain: e.target.value || undefined })}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all"
          >
            <option value="">All Domains</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="min-w-[140px]">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">AI Status</label>
          <select
            value={filters.aiStatus ?? ''}
            onChange={(e) => update({ aiStatus: (e.target.value as AiStatus) || undefined })}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Relevance slider */}
        <div className="min-w-[180px]">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            Min Relevance:{' '}
            <span className="font-semibold text-indigo-600">{relevanceDisplay}</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={relevanceDisplay}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setRelevanceDisplay(v);
              update({ minRelevance: v > 0 ? v : undefined });
            }}
            className="w-full accent-indigo-600 h-2 cursor-pointer"
          />
        </div>

        {/* Clear (keeps left-side region/country/website selection) */}
        {(filters.companyName || filters.domain || filters.aiStatus || filters.minRelevance) && (
          <button
            onClick={() => {
              setRelevanceDisplay(0);
              onChange({
                page: 1,
                limit: filters.limit,
                region: filters.region,
                country: filters.country,
                jobWebsite: filters.jobWebsite,
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
