'use client';

import Link from 'next/link';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  gradient: string; // CSS gradient string
  icon: React.ReactNode;
  badge?: string;
  href?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  subtitle,
  gradient,
  icon,
  badge,
  href,
  onClick,
}: StatsCardProps) {
  const content = (
    <>
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
    </>
  );

  const className =
    'relative rounded-2xl p-6 text-white overflow-hidden shadow-lg block transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

  if (href) {
    return (
      <Link href={href} className={className} style={{ background: gradient }}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} w-full text-left cursor-pointer`}
        style={{ background: gradient }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} style={{ background: gradient }}>
      {content}
    </div>
  );
}
