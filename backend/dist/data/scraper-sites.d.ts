export interface ScraperSiteSeed {
    /** Unique source name = site domain without www (e.g. "reed.co.uk"). */
    name: string;
    country: string;
    website: string;
    enabled: boolean;
}
/**
 * European country job sites supported by the Playwright scrapers
 * (backend/scraper/sites). Matches SITES_STATUS.md:
 * working sites are seeded enabled; anti-bot/closed sites are seeded
 * disabled (visible in the Sources UI, but not scheduled).
 */
export declare const SCRAPER_SITES: ScraperSiteSeed[];
/** The LinkedIn source (Apify actor) is always present. */
export declare const LINKEDIN_SOURCE: {
    name: string;
    type: "APIFY";
    country: null;
    website: null;
    enabled: boolean;
};
