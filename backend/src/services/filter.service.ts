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
  const { qualified, domain } = qualifyJob(job, undefined, 'strict');
  return { relevant: qualified, domain };
}

export type QualificationMode = 'strict' | 'keyword';

/**
 * Word-boundary keyword match: every whitespace-separated token of the
 * keyword must appear as a whole word (not a substring) in the text.
 * Prevents false matches like "SAC" matching "Sacavém" or "sacred".
 */
export function keywordMatches(keyword: string, text: string): boolean {
  const tokens = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const lower = text.toLowerCase();
  return tokens.every((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'u').test(lower);
  });
}

/**
 * Deterministic qualification gate.
 *  - Exclude rules ALWAYS apply (HR/sales/recruitment roles never reach AI).
 *  - strict:  require a keep-rule match (LinkedIn path).
 *  - keyword: keep if a keep-rule matches OR the search keyword appears
 *             in the title/description (country-site scrapers already searched by keyword).
 */
export function qualifyJob(
  job: { jobTitle?: string; description?: string },
  keyword?: string,
  mode: QualificationMode = 'strict',
): { qualified: boolean; domain: string | null } {
  const text = `${job.jobTitle ?? ''} ${job.description ?? ''}`;

  for (const pattern of EXCLUDE_RULES) {
    if (pattern.test(text)) {
      return { qualified: false, domain: null };
    }
  }

  if (mode === 'keyword' && keyword) {
    if (keywordMatches(keyword, text)) {
      return { qualified: true, domain: null };
    }
  }

  for (const { pattern, domain } of KEEP_RULES) {
    if (pattern.test(text)) {
      return { qualified: true, domain };
    }
  }

  return { qualified: false, domain: null };
}

export function mapApifyItemToRaw(
  item: ApifyJobItem,
  keyword: string,
  location: string,
) {
  // Normalize field names — LinkedIn scraper may vary slightly
  const jobId =
    String(item.id ?? item.jobId ?? '') ||
    `${item.companyName ?? 'unknown'}-${item.title ?? 'unknown'}-${Date.now()}`;

  // Job link: explicit url, else reconstruct from the numeric LinkedIn job id
  // (the actor returns companyUrl but often omits the job posting url).
  const rawUrl = item.url ? String(item.url) : null;
  const url =
    rawUrl ?? (/^\d+$/.test(jobId) ? `https://www.linkedin.com/jobs/view/${jobId}` : null);

  return {
    jobId,
    jobTitle: String(item.title ?? item['jobTitle'] ?? 'Unknown Title'),
    jobDescription: String(item.description ?? item.descriptionHtml ?? item['jobDescription'] ?? ''),
    companyName: String(item.companyName ?? item.company ?? item['company'] ?? 'Unknown Company'),
    companyId: item.companyId ? String(item.companyId) : null,
    companyUrl: item.companyUrl ? String(item.companyUrl) : null,
    location: item.location ? String(item.location) : null,
    country: location,
    searchString: keyword,
    url,
    publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
  };
}
