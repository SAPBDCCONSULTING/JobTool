/**
 * Run one country-site scrape + shared processing for a SourceRun.
 * Spawns `scrape.py` and streams its JSON output — worker-safe,
 * never called from the HTTP request path.
 */
export declare function runCountryScrape(sourceRunId: string): Promise<void>;
