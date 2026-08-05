interface ConfidenceBadgeProps {
  value: number | null;
  showBar?: boolean;
}

export function ConfidenceBadge({ value, showBar = false }: ConfidenceBadgeProps) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-slate-400 italic">—</span>;
  }

  const pct = Math.round(value * 100);

  const getConfig = () => {
    if (pct >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', ring: 'ring-emerald-200' };
    if (pct >= 60) return { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500', ring: 'ring-blue-200' };
    if (pct >= 40) return { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500', ring: 'ring-amber-200' };
    return { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-400', ring: 'ring-red-200' };
  };

  const config = getConfig();

  if (showBar) {
    return (
      <div className="flex items-center gap-2 min-w-[100px]">
        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${config.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-semibold min-w-[32px] ${config.text}`}>{pct}%</span>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${config.bg} ${config.text} ${config.ring}`}>
      {pct}%
    </span>
  );
}

interface StatusBadgeProps {
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    PENDING: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Pending' },
    PROCESSING: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Processing' },
    DONE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Done' },
    FAILED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Failed' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'PROCESSING' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}

interface DomainBadgeProps {
  domain: string | null | undefined;
}

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  'SAP': { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  'ERP': { bg: 'bg-purple-50', text: 'text-purple-700' },
  'Cloud': { bg: 'bg-sky-50', text: 'text-sky-700' },
  'Data & Analytics': { bg: 'bg-teal-50', text: 'text-teal-700' },
};

export function DomainBadge({ domain }: DomainBadgeProps) {
  if (!domain) return <span className="text-xs text-slate-400 italic">—</span>;
  const colors = DOMAIN_COLORS[domain] ?? { bg: 'bg-slate-100', text: 'text-slate-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      {domain}
    </span>
  );
}
