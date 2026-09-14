import { type ApifyJobItem } from './apify.service.js';
import { type QualificationMode } from './filter.service.js';
export interface ProcessRawItemsResult {
    rawNew: number;
    rawExisting: number;
    canonicalNew: number;
    canonicalMatched: number;
    filtered: number;
    failed: number;
}
export interface ProcessRawOptions {
    /** Source name (e.g. "linkedin-apify", "reed.co.uk") — provenance on every raw record. */
    source: string;
    sourceRunId?: string;
    keyword?: string;
    keywordId?: string;
    country: string;
    filterMode?: QualificationMode;
}
/**
 * Core pipeline shared by every source (LinkedIn/Apify, European site scrapers):
 *
 *   RawJobRecord (always stored)
 *     → company resolution
 *     → canonical dedup (job hash within 90d)
 *     → linked duplicate? refresh lastSeen | new? create canonical (CleanJob, PENDING)
 *
 * Only canonical jobs proceed to AI — never re-run on re-observed unchanged jobs.
 */
export declare function processRawItems(items: ApifyJobItem[], opts: ProcessRawOptions): Promise<ProcessRawItemsResult>;
export declare function fetchAndProcessApify(sourceRunId: string): Promise<void>;
