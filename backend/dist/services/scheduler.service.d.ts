import type { Keyword, Source } from '@prisma/client';
/** Ensure the LinkedIn + all known website sources exist in the DB (idempotent). */
export declare function ensureSources(): Promise<number>;
/** Resolve a Source by its name or website domain, creating it lazily when needed. */
export declare function findOrCreateSource(input: {
    name: string;
    type?: 'APIFY' | 'SCRAPER';
    country?: string | null;
    website?: string | null;
}): Promise<Source>;
/** Resolve a Keyword by term (case-insensitive), creating it lazily when needed. */
export declare function findOrCreateKeyword(term: string, extra?: {
    location?: string | null;
    category?: string;
}): Promise<Keyword>;
/**
 * Create a SourceRun for a keyword×source pair and enqueue it.
 * Skips if an identical run is still QUEUED/RUNNING (idempotency).
 */
export declare function createRunForPair(keyword: Keyword, source: Source, runType: 'scheduled' | 'manual'): Promise<{
    runId: string;
} | null>;
/** Enqueue scheduled runs for every enabled keyword × enabled source that is due. */
export declare function enqueueDueRuns(): Promise<number>;
/** Manual "run now" — skip the due window entirely. Optionally scope to one keyword. */
export declare function triggerManualRuns(keywordId?: string): Promise<number>;
/** Re-enqueue a failed/completed run. */
export declare function retryRun(sourceRunId: string): Promise<void>;
