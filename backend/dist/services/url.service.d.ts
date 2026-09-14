export declare function getSourceBaseMap(): Promise<Map<string, string>>;
/**
 * Normalize a job URL: make relative URLs (e.g. "/job/12345") absolute
 * against the source site's origin. Returns null when unresolvable.
 */
export declare function normalizeJobUrl(url: string | null | undefined, sourceName?: string | null, bases?: Map<string, string>): string | null;
