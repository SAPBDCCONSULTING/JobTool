/** Normalize a raw company name into a stable matching key (e.g. "ABC Incorporated" → "abc"). */
export declare function normalizeCompanyName(raw: string | null | undefined): string;
/** Display name: trimmed original, single-spaced. */
export declare function cleanDisplayName(raw: string | null | undefined): string;
/**
 * Resolve a raw company name to a Company row (auto-creating when needed).
 * Matching is done on the normalized key; display aliases are accumulated.
 */
export declare function resolveCompany(rawName: string, country?: string | null): Promise<{
    id: string;
    name: string;
    normalizedName: string;
}>;
