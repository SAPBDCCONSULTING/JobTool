import type { ApifyJobItem } from './apify.service.js';
export interface FilterResult {
    relevant: boolean;
    domain: string | null;
}
export declare function filterJob(job: {
    jobTitle?: string;
    description?: string;
}): FilterResult;
export type QualificationMode = 'strict' | 'keyword';
/**
 * Word-boundary keyword match: every whitespace-separated token of the
 * keyword must appear as a whole word (not a substring) in the text.
 * Prevents false matches like "SAC" matching "Sacavém" or "sacred".
 */
export declare function keywordMatches(keyword: string, text: string): boolean;
/**
 * Deterministic qualification gate.
 *  - Exclude rules ALWAYS apply (HR/sales/recruitment roles never reach AI).
 *  - strict:  require a keep-rule match (LinkedIn path).
 *  - keyword: keep if a keep-rule matches OR the search keyword appears
 *             in the title/description (country-site scrapers already searched by keyword).
 */
export declare function qualifyJob(job: {
    jobTitle?: string;
    description?: string;
}, keyword?: string, mode?: QualificationMode): {
    qualified: boolean;
    domain: string | null;
};
export declare function mapApifyItemToRaw(item: ApifyJobItem, keyword: string, location: string): {
    jobId: string;
    jobTitle: string;
    jobDescription: string;
    companyName: string;
    companyId: string | null;
    companyUrl: string | null;
    location: string | null;
    country: string;
    searchString: string;
    url: string | null;
    publishedAt: Date | null;
};
