'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface SectionInfoItem {
  title: string;
  body: string;
}

export interface SectionInfoContent {
  title?: string;
  summary: string;
  items?: SectionInfoItem[];
  footer?: string;
  accentClass?: string;
}

interface SectionInfoButtonProps {
  label: string;
  content: SectionInfoContent;
}

export function SectionInfoButton({ label, content }: SectionInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const accent = content.accentClass ?? 'text-indigo-700';

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-colors"
        style={{ background: open ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)' }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`${label} help`}
          className="absolute left-0 top-full mt-2 z-50 w-[min(100vw-2rem,24rem)] rounded-2xl bg-white shadow-xl border border-slate-200 p-4 text-left"
        >
          <p className="text-sm font-semibold text-slate-900 mb-1">
            {content.title ?? 'What is this page?'}
          </p>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">{content.summary}</p>
          {content.items && content.items.length > 0 && (
            <ul className="space-y-2.5">
              {content.items.map((item) => (
                <li key={item.title}>
                  <p className={`text-xs font-semibold ${accent}`}>{item.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
          {content.footer && (
            <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">{content.footer}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Shared copy for each main HireIntel section header. */
export const SECTION_INFO = {
  dashboard: {
    summary:
      'Overview of the full demand pipeline: jobs scraped → companies analyzed → opportunities → pitches → feedback outcomes.',
    accentClass: 'text-indigo-700',
    items: [
      {
        title: 'Job KPIs',
        body: 'Total / clean / AI-processed / high-confidence counts from LinkedIn (Apify) and Europe scrapers. Cards deep-link into Jobs.',
      },
      {
        title: 'Demand pipeline',
        body: 'Live counts for company intelligence done, qualified opportunities, pitches ready, and won/contacted outcomes.',
      },
      {
        title: 'Auto-scrape',
        body: 'Worker runs a full LinkedIn + Europe scan every 24 hours. You can still fetch jobs manually here.',
      },
    ],
    footer: 'Recent Activity shows the latest AI-classified jobs. Use Search Jobs for an on-demand LinkedIn pull.',
  },
  jobs: {
    summary:
      'Browse and filter classified job listings from LinkedIn and Europe country sites. Same company+title+country is deduped on ingest.',
    accentClass: 'text-sky-700',
    items: [
      {
        title: 'Region tree',
        body: 'Filter Region → Country → Job Website. Red sites are blocked/closed and won’t scrape.',
      },
      {
        title: 'Confidence',
        body: 'AI job score (≥70% = high intent). Use min confidence filter or open from Dashboard high-confidence KPI.',
      },
      {
        title: 'Scrape',
        body: 'Trigger a country website scrape from the tree or Sources. Daily scheduler also refreshes working sites.',
      },
    ],
    footer: 'Duplicates with the same job id or same company + title + country are skipped so listings stay clean.',
  },
  companies: {
    summary:
      'Rolls up classified jobs per company into a sales-ready view: opportunity score, why now, and what to sell.',
    accentClass: 'text-emerald-700',
    items: [
      {
        title: 'Opportunity score',
        body: '0–100% AI score of how strongly hiring shows active investment in SAP, ERP, Cloud, or Data.',
      },
      {
        title: 'Why now / What to sell',
        body: 'Timing narrative from recent roles, plus recommended offering (e.g. S/4HANA, cloud, data platform).',
      },
      {
        title: 'Refresh cadence',
        body: 'New companies score immediately. Existing scores re-run at most every 3 days when there are new jobs or relevance drift.',
      },
    ],
    footer: 'One row per company + country (job count aggregated). Use Analyze companies after jobs are AI-classified.',
  },
  opportunities: {
    summary:
      'Turns company intelligence into a sales pipeline: ranked deals with a stage and a recommended offering to pitch.',
    accentClass: 'text-indigo-700',
    items: [
      {
        title: 'Rank',
        body: '#1 is the strongest score. Dense ranking across non-disqualified opportunities.',
      },
      {
        title: 'Qualify / stage',
        body: 'Auto: ≥70% → QUALIFIED, 50–69% → NURTURE, lower → NEW / DISQUALIFIED. Move to CONTACTED, WON, or LOST manually.',
      },
      {
        title: 'Recommended offering',
        body: 'Mapped product to sell from domain + what-to-sell signals. Log outcomes from an expanded row.',
      },
    ],
    footer: 'Use Sync from companies after company AI finishes. Stages you set manually are preserved on sync.',
  },
  outreach: {
    summary:
      'AI pitch generator for qualified opportunities: angles, personalized email subject/body, and a clear CTA.',
    accentClass: 'text-violet-700',
    items: [
      {
        title: 'Generate pitches',
        body: 'Queues AI drafts from opportunity + company intelligence (why now, what to sell, job signals).',
      },
      {
        title: 'Ready vs pending',
        body: 'Ready = draft available to copy/send. Pending = waiting in the ai-pitch queue.',
      },
      {
        title: 'Contacts',
        body: 'Emails found in job text are attached when available to speed outreach.',
      },
    ],
    footer: 'Regenerate a pitch anytime from the row actions. Pair with Feedback after you contact the account.',
  },
  feedback: {
    summary:
      'Human-in-the-loop outcomes on opportunities: reviewed → contacted → replied → meeting → won / lost.',
    accentClass: 'text-teal-700',
    items: [
      {
        title: 'Pipeline',
        body: 'Current opportunity stages in the sales funnel (including WON / LOST).',
      },
      {
        title: 'Event log',
        body: 'Audit trail of every outcome you logged from Opportunities (expand a row → log).',
      },
      {
        title: 'Next',
        body: 'Future: calibrate AI opportunity scores from WON/LOST outcomes.',
      },
    ],
    footer: 'Dashboard “Won / contacted” uses these pipeline counts. Log outcomes as you work each deal.',
  },
  sources: {
    summary:
      'Country job websites used for Europe Playwright scrapes. Click a country to run an on-demand scrape.',
    accentClass: 'text-indigo-700',
    items: [
      {
        title: 'Working sites',
        body: 'Green/normal cards scrape successfully. Results land in Jobs after ingest + AI classify.',
      },
      {
        title: 'Blocked / closed',
        body: 'Red cards hit anti-bot or shut-down sites — scrape will report blocked instead of fake empties.',
      },
      {
        title: 'Daily auto-scrape',
        body: 'Scheduler refreshes all working Europe sites every 24h (plus LinkedIn locations). Manual click still works anytime.',
      },
    ],
    footer: 'Keyword defaults to SAP on scheduled runs. Change SCHEDULER_* env vars on the backend worker to adjust.',
  },
} as const satisfies Record<string, SectionInfoContent>;

export function SectionTitleWithInfo({
  title,
  label,
  content,
  children,
}: {
  title: ReactNode;
  label: string;
  content: SectionInfoContent;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <SectionInfoButton label={label} content={content} />
      {children}
    </div>
  );
}
