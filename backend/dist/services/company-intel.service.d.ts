import { z } from 'zod';
export interface CompanyMetrics {
    activeJobs: number;
    jobs7d: number;
    jobs30d: number;
    topTechnologies: string[];
    notableRoles: string[];
    avgRelevance: number | null;
    avgOutsourcing: number | null;
    functionalCount: number;
    technicalCount: number;
    recentTitles: string[];
}
export declare function computeCompanyMetrics(companyId: string): Promise<CompanyMetrics | null>;
export declare const FORMULA_VERSION = "opportunity-v1";
export interface ScoreBreakdown {
    relevance: {
        value: number;
        weight: number;
    };
    volume: {
        value: number;
        weight: number;
    };
    velocity: {
        value: number;
        weight: number;
    };
    outsourcing: {
        value: number;
        weight: number;
    };
}
export declare function computeOpportunityScore(m: CompanyMetrics): {
    score: number;
    breakdown: ScoreBreakdown;
    explanation: string[];
};
declare const CompanyIntelSchema: z.ZodObject<{
    likely_initiative: z.ZodString;
    recommended_services: z.ZodArray<z.ZodString, "many">;
    evidence: z.ZodArray<z.ZodString, "many">;
    summary: z.ZodString;
}, "strip", z.ZodTypeAny, {
    summary: string;
    evidence: string[];
    likely_initiative: string;
    recommended_services: string[];
}, {
    summary: string;
    evidence: string[];
    likely_initiative: string;
    recommended_services: string[];
}>;
export type CompanyIntelResult = z.infer<typeof CompanyIntelSchema>;
export declare const COMPANY_PROMPT_VERSION = "company-intel-v2";
export declare const COMPANY_MODEL = "gpt-4o-mini";
/**
 * Full company recalculation: metrics → opportunity score → company AI → upsert.
 * Safe to call for companies with zero analyzed jobs (stores zero-state).
 */
export declare function recalculateCompany(companyId: string): Promise<void>;
export {};
