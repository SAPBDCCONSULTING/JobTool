interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  gradient: string; // CSS gradient string
  icon: React.ReactNode;
  badge?: string;
}

export function StatsCard({ title, value, subtitle, gradient, icon, badge }: StatsCardProps) {
  return (
    <div
      className="relative rounded-2xl p-6 text-white overflow-hidden shadow-lg"
      style={{ background: gradient }}
    >
      {/* Background decoration */}
      <div
        className="absolute -top-4 -right-4 w-28 h-28 rounded-full opacity-10"
        style={{ background: 'rgba(255,255,255,0.4)' }}
      />
      <div
        className="absolute -bottom-6 -right-2 w-20 h-20 rounded-full opacity-10"
        style={{ background: 'rgba(255,255,255,0.3)' }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {icon}
          </div>
          {badge && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="text-3xl font-bold tracking-tight mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-sm font-semibold opacity-90">{title}</div>
        {subtitle && <div className="text-xs opacity-70 mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}
