import { z } from 'zod';
export declare const JobAnalysisSchema: z.ZodObject<{
    relevance_score: z.ZodNumber;
    technologies: z.ZodArray<z.ZodString, "many">;
    role_category: z.ZodString;
    seniority: z.ZodString;
    project_type: z.ZodString;
    outsourcing_potential: z.ZodNumber;
    summary: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    technologies: string[];
    seniority: string;
    summary: string;
    relevance_score: number;
    role_category: string;
    project_type: string;
    outsourcing_potential: number;
    reason: string;
}, {
    technologies: string[];
    seniority: string;
    summary: string;
    relevance_score: number;
    role_category: string;
    project_type: string;
    outsourcing_potential: number;
    reason: string;
}>;
export type JobAnalysisResult = z.infer<typeof JobAnalysisSchema>;
export declare const JOB_PROMPT_VERSION = "job-analysis-v2";
export declare const JOB_MODEL = "gpt-4o-mini";
export declare function analyzeJob(job: {
    jobTitle: string;
    jobDescription: string;
    companyName: string;
    keyword?: string;
}): Promise<JobAnalysisResult>;
