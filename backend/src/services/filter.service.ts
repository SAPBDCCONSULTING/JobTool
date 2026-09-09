import type { ApifyJobItem } from './apify.service.js';

// ─── Keep patterns: domain-tagged rules ──────────────────────
const KEEP_RULES: { pattern: RegExp; domain: string }[] = [
  { pattern: /\bs\/4\s*hana\b/i, domain: 'SAP' },
  { pattern: /\bsap\b/i, domain: 'SAP' },
  { pattern: /\bhana\b/i, domain: 'SAP' },
  { pattern: /\bsap\s+fi\b/i, domain: 'SAP' },
  { pattern: /\bsap\s+co\b/i, domain: 'SAP' },
  { pattern: /\bsap\s+mm\b/i, domain: 'SAP' },
  { pattern: /\bsap\s+sd\b/i, domain: 'SAP' },
  { pattern: /\bsap\s+abap\b/i, domain: 'SAP' },
  { pattern: /\bsap\s+basis\b/i, domain: 'SAP' },
  { pattern: /\bsap\s+ewm\b/i, domain: 'SAP' },
  { pattern: /\berp\b/i, domain: 'ERP' },
  { pattern: /finance\s+system/i, domain: 'ERP' },
  { pattern: /enterprise\s+resource/i, domain: 'ERP' },
  { pattern: /oracle\s+(ebs|erp|financials|hcm)/i, domain: 'ERP' },
  { pattern: /microsoft\s+dynamics/i, domain: 'ERP' },
  { pattern: /\baws\b/i, domain: 'Cloud' },
  { pattern: /\bazure\b/i, domain: 'Cloud' },
  { pattern: /\bgcp\b/i, domain: 'Cloud' },
  { pattern: /google\s+cloud/i, domain: 'Cloud' },
  { pattern: /\bcloud\s+(architect|engineer|consultant|migration)/i, domain: 'Cloud' },
  { pattern: /cloud\s+infrastructure/i, domain: 'Cloud' },
  { pattern: /\bdevops\b/i, domain: 'Cloud' },
  { pattern: /\bkubernetes\b/i, domain: 'Cloud' },
  { pattern: /data\s+engineer/i, domain: 'Data & Analytics' },
  { pattern: /data\s+analyst/i, domain: 'Data & Analytics' },
  { pattern: /data\s+scientist/i, domain: 'Data & Analytics' },
  { pattern: /data\s+architect/i, domain: 'Data & Analytics' },
  { pattern: /\banalytics\b/i, domain: 'Data & Analytics' },
  { pattern: /\bpower\s+bi\b/i, domain: 'Data & Analytics' },
  { pattern: /\btableau\b/i, domain: 'Data & Analytics' },
  { pattern: /\bsparks?\b/i, domain: 'Data & Analytics' },
  { pattern: /\bsnowflake\b/i, domain: 'Data & Analytics' },
  { pattern: /\bdatabricks?\b/i, domain: 'Data & Analytics' },
  { pattern: /business\s+intelligence/i, domain: 'Data & Analytics' },
];

// ─── Exclude patterns: roles we don't want ───────────────────
const EXCLUDE_RULES: RegExp[] = [
  /\bhr\s+manager\b/i,
  /human\s+resource\s+manager/i,
  /\brecruiter\b/i,
  /\btalent\s+acquisition\b/i,
  /\bsales\s+(manager|executive|director|representative|rep)\b/i,
  /\bmarketing\s+(manager|specialist|executive|director)\b/i,
  /\baccount\s+manager\b/i,
  /business\s+development\s+(manager|executive)/i,
  /\bsocial\s+media\b/i,
  /\bcontent\s+(writer|creator|manager)\b/i,
];

export interface FilterResult {
  relevant: boolean;
  domain: string | null;
}

export function filterJob(job: { jobTitle?: string; description?: string }): FilterResult {
  const text = `${job.jobTitle ?? ''} ${job.description ?? ''}`;

  for (const pattern of EXCLUDE_RULES) {
    if (pattern.test(text)) {
      return { relevant: false, domain: null };
    }
  }

  for (const { pattern, domain } of KEEP_RULES) {
    if (pattern.test(text)) {
      return { relevant: true, domain };
    }
  }

  return { relevant: false, domain: null };
}

export function mapApifyItemToRaw(
  item: ApifyJobItem,
  keyword: string,
  location: string,
) {
  // Prefer source id/url; never use Date.now() — that defeats dedup on re-scrape.
  const companyName = String(
    item.companyName ?? item.company ?? item['company'] ?? 'Unknown Company',
  );
  const jobTitle = String(item.title ?? item['jobTitle'] ?? 'Unknown Title');
  const sourceId = String(item.id ?? item.jobId ?? '').trim();
  const sourceUrl = String(
    (item as { url?: string; jobUrl?: string; link?: string }).url ??
      (item as { jobUrl?: string }).jobUrl ??
      (item as { link?: string }).link ??
      '',
  ).trim();

  const jobId =
    sourceId ||
    sourceUrl ||
    `${normalizeKey(companyName)}::${normalizeKey(jobTitle)}`;

  return {
    jobId,
    jobTitle,
    jobDescription: String(
      item.description ?? item.descriptionHtml ?? item['jobDescription'] ?? '',
    ),
    companyName,
    companyId: item.companyId ? String(item.companyId) : null,
    companyUrl: item.companyUrl ? String(item.companyUrl) : null,
    location: item.location ? String(item.location) : null,
    country: location,
    searchString: keyword,
    publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
  };
}

function normalizeKey(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}
