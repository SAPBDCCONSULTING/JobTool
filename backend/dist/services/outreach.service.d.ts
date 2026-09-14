import { z } from 'zod';
declare const OutreachSchema: z.ZodObject<{
    subject: z.ZodString;
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    subject: string;
    body: string;
}, {
    subject: string;
    body: string;
}>;
export type OutreachResult = z.infer<typeof OutreachSchema>;
export declare const OUTREACH_PROMPT_VERSION = "outreach-v1";
export declare const OUTREACH_MODEL = "gpt-4o-mini";
export interface OutreachContext {
    companyName: string;
    country: string | null;
    likelyInitiative: string | null;
    recommendedServices: string[];
    evidence: string[];
    activeJobs: number | null;
    topTechnologies: string[];
}
export declare function generateOutreach(ctx: OutreachContext): Promise<OutreachResult>;
export {};
