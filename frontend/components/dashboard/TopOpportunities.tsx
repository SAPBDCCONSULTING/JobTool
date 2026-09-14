'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchCompanies } from '@/lib/api';
import type { Company } from '@/lib/types';

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-slate-400';
}

export function TopOpportunities() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies()
      .then((res) => setCompanies(res.companies.filter((c) => c.score !== null).slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (companies.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-700 text-sm">Top Opportunities</h3>
        <Link href="/companies" className="text-xs font-semibold text-indigo-600 hover:underline">
          View all →
        </Link>
      </div>
      <div className="space-y-3">
        {companies.map((c, i) => (
          <Link
            key={c.id}
            href={`/companies/${c.id}`}
            className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all"
          >
            <span className="w-6 text-center text-sm font-medium text-slate-400">{i + 1}</span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: `hsl(${(c.companyName.charCodeAt(0) * 47) % 360}, 65%, 50%)` }}
            >
              {c.companyName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{c.companyName}</p>
              <p className="text-xs text-slate-400 truncate">
                {c.activeJobs ?? c.jobCount} active jobs
                {c.likelyInitiative ? ` · ${c.likelyInitiative}` : ''}
              </p>
            </div>
            <span
              className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-white text-sm font-bold flex-shrink-0 ${scoreColor(c.score!)}`}
            >
              {Math.round(c.score!)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}