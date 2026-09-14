import { createHash } from 'crypto';

/** Lowercase, collapse non-alphanumeric runs to single spaces, trim. */
export function normalizeText(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Stable identity hash for a unique real-world job.
 * Same company + title + location across sources (LinkedIn, reed.co.uk, ...)
 * produces the same hash so cross-source duplicates collapse into one canonical job.
 */
export function jobHash(
  companyNorm: string,
  title: string | null | undefined,
  location: string | null | undefined,
): string {
  return createHash('sha1')
    .update(`${normalizeText(companyNorm)}|${normalizeText(title)}|${normalizeText(location)}`)
    .digest('hex');
}

// ─── Job title cleaning ──────────────────────────────────────────────────────

/** Relative-date prefixes some sites prepend to titles ("3 weeks ago", "Yesterday"). */
const LEADING_DATE_RE =
  /^\s*[([]?\s*(?:\d+\s+(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\s+ago|yesterday|today|just\s+posted)\s*[)\]]?\s*[-–—:|]?\s*/i;

/** Aggregator/site junk occasionally appended to titles by sources. */
const KNOWN_TITLE_JUNK = new Set([
  'jobbird.com',
  'jobbird',
  'indeed.com',
  'linkedin',
  'stepstone',
  'jobs.ch',
  'mojposao',
  'moj-posao',
]);

/** Collapse whitespace and trim. */
function squash(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Clean a scraped job title:
 *  - strip leading relative-date prefixes ("11 hours agoSenior SAP...")
 *  - strip trailing "- {companyName}" / "- Jobbird.com" style suffixes
 *  - collapse whitespace
 *
 * Returns the title unchanged when nothing matches. Used both at ingest
 * (before hashing, so dedup keys are stable) and in the backfill script.
 */
export function cleanJobTitle(title: string | null | undefined, companyName?: string | null): string {
  if (!title) return '';
  let t = squash(title);

  // Leading relative-date junk (loop: some sites stack "2 days ago" + "New")
  for (let i = 0; i < 3; i++) {
    const stripped = t.replace(LEADING_DATE_RE, '');
    if (stripped === t) break;
    t = squash(stripped);
  }

  // Trailing "- <company>" / "| <company>" suffixes (match against the company
  // name with and without legal suffixes, and known aggregator domains).
  const companyKeys = new Set<string>();
  if (companyName) {
    const cn = normalizeText(companyName);
    if (cn) companyKeys.add(cn);
    const cnNoSuffix = cn.replace(/\b(gmbh|ag|sa|sarl|srl|spa|bv|ltd|limited|inc|llc|plc|oy|ab|as|a\/s)\b/g, '').trim();
    if (cnNoSuffix) companyKeys.add(cnNoSuffix);
  }
  for (let i = 0; i < 3; i++) {
    const m = t.match(/\s*[-–—|]\s*([^-–—|]+)\s*$/);
    if (!m) break;
    const seg = normalizeText(m[1]);
    if (companyKeys.has(seg) || KNOWN_TITLE_JUNK.has(seg)) {
      t = squash(t.slice(0, m.index));
    } else {
      break;
    }
  }

  return t;
}
