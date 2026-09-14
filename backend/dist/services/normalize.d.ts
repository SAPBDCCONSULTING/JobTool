/** Lowercase, collapse non-alphanumeric runs to single spaces, trim. */
export declare function normalizeText(s: string | null | undefined): string;
/**
 * Stable identity hash for a unique real-world job.
 * Same company + title + location across sources (LinkedIn, reed.co.uk, ...)
 * produces the same hash so cross-source duplicates collapse into one canonical job.
 */
export declare function jobHash(companyNorm: string, title: string | null | undefined, location: string | null | undefined): string;
/**
 * Clean a scraped job title:
 *  - strip leading relative-date prefixes ("11 hours agoSenior SAP...")
 *  - strip trailing "- {companyName}" / "- Jobbird.com" style suffixes
 *  - collapse whitespace
 *
 * Returns the title unchanged when nothing matches. Used both at ingest
 * (before hashing, so dedup keys are stable) and in the backfill script.
 */
export declare function cleanJobTitle(title: string | null | undefined, companyName?: string | null): string;
