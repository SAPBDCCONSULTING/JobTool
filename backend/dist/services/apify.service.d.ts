export interface ApifyJobItem {
    id?: string;
    jobId?: string;
    title?: string;
    description?: string;
    descriptionHtml?: string;
    companyName?: string;
    company?: string;
    companyId?: string;
    companyUrl?: string;
    location?: string;
    publishedAt?: string;
    url?: string;
    [key: string]: unknown;
}
export declare function triggerApifyRun(keyword: string, location: string): Promise<{
    runId: string;
    datasetId: string;
}>;
export declare function waitForApifyRun(runId: string, maxWaitMs?: number): Promise<string>;
export declare function fetchApifyDataset(datasetId: string): Promise<ApifyJobItem[]>;
