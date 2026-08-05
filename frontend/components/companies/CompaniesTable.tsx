import type { Company } from '@/lib/types';
import { ConfidenceBadge, DomainBadge } from '@/components/ui/ConfidenceBadge';

interface CompaniesTableProps {
  companies: Company[];
  loading?: boolean;
}

export function CompaniesTable({ companies, loading }: CompaniesTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="animate-pulse">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-0">
              <div className="w-9 h-9 bg-slate-200 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-slate-200 rounded w-1/4" />
                <div className="h-2.5 bg-slate-200 rounded w-1/6" />
              </div>
              <div className="h-5 bg-slate-200 rounded w-16" />
              <div className="h-5 bg-slate-200 rounded-full w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">No companies yet</p>
        <p className="text-slate-400 text-sm mt-1">Companies appear after AI classification is complete</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Country</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jobs</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Confidence</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Domain</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hiring Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((company, index) => {
              const signal =
                (company.avgConfidence ?? 0) >= 0.85
                  ? { label: 'Very Strong', color: 'text-emerald-600 bg-emerald-50' }
                  : (company.avgConfidence ?? 0) >= 0.7
                  ? { label: 'Strong', color: 'text-blue-600 bg-blue-50' }
                  : (company.avgConfidence ?? 0) >= 0.5
                  ? { label: 'Moderate', color: 'text-amber-600 bg-amber-50' }
                  : { label: 'Weak', color: 'text-slate-500 bg-slate-100' };

              return (
                <tr key={`${company.companyName}-${company.country}`} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-400">{index + 1}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{
                          background: `hsl(${(company.companyName.charCodeAt(0) * 47) % 360}, 65%, 50%)`,
                        }}
                      >
                        {company.companyName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800 text-sm">{company.companyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-600">{company.country}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold text-slate-800">{company.jobCount.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 ml-1">jobs</span>
                  </td>
                  <td className="px-4 py-4">
                    <ConfidenceBadge value={company.avgConfidence} showBar />
                  </td>
                  <td className="px-4 py-4">
                    <DomainBadge domain={company.topDomain} />
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${signal.color}`}>
                      {signal.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
