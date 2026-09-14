import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
// ─── Output schema (v1 analysis) ─────────────────────────────
export const JobAnalysisSchema = z.object({
    relevance_score: z.number().min(0).max(100),
    technologies: z.array(z.string()).max(12),
    role_category: z.string(),
    seniority: z.string(),
    project_type: z.string(),
    outsourcing_potential: z.number().min(0).max(1),
    summary: z.string(),
    reason: z.string(),
});
export const JOB_PROMPT_VERSION = 'job-analysis-v2';
export const JOB_MODEL = 'gpt-4o-mini';
// ─── Agent definition (created once, reused across calls) ────
const classifierAgent = new Agent({
    name: 'JobIntelligenceAnalyzer',
    model: JOB_MODEL,
    instructions: `You are an expert hiring-intelligence analyst for enterprise technology consulting (SAP / ERP / Cloud / Data).

Analyze a job posting and produce a structured assessment of what the hire signals about the company's investment and how sellable the opportunity is for a consulting/outsourcing firm.

Respond with ONLY a valid JSON object — no markdown, no explanation outside JSON:
{
  "relevance_score": <int 0-100>,   // how relevant is this role to SAP/ERP/Cloud/Data consulting opportunities
  "technologies": ["S/4HANA", "FICO", "BTP", ...],  // specific SAP modules / ERP / cloud / data technologies mentioned (max 8, [] if none)
  "role_category": "<functional | technical | techno-functional | leadership | data | cloud | other>",
  "seniority": "<junior | mid | senior | lead | principal | director | vp+ | unknown>",
  "project_type": "<implementation | migration | rollout | support | transformation | greenfield | brownfield | integration | managed-services | unknown>",
  "outsourcing_potential": <float 0.0-1.0>,  // 0.9+ = clearly outsourceable body-of-work; 0.5 = mixed; 0.2 = internal strategic role
  "summary": "<1-2 sentence plain summary of what this hiring signals>",
  "reason": "<1-2 sentence justification of the relevance score>"
}

Scoring guidance for relevance_score:
  90-100: core SAP module consultant/architect (S/4HANA, FICO, MM, SD, ABAP, BTP, SAC)
  75-89:  strong ERP/Cloud/Data roles clearly tied to enterprise transformation
  55-74:  adjacent roles (ERP project managers, integration engineers, data engineers)
  30-54:  weak/peripheral (IT support with some SAP exposure, general PM)
  0-29:   not relevant

outsourcing_potential guidance:
  - implementation/migration/rollout/support/managed-services roles → high (0.7-1.0)
  - integration/techno-functional → medium-high (0.5-0.8)
  - transformation leadership, strategy, internal-only roles → low (0.1-0.4)`,
    outputType: JobAnalysisSchema,
});
export async function analyzeJob(job) {
    const userMessage = `Company: ${job.companyName}
Job Title: ${job.jobTitle}
${job.keyword ? `Search context: ${job.keyword}` : ''}

Job Description:
${job.jobDescription.slice(0, 4000)}`;
    logger.debug({ jobTitle: job.jobTitle, company: job.companyName }, 'Analyzing job with AI');
    const result = await run(classifierAgent, userMessage);
    if (!result.finalOutput) {
        throw new Error('AI classifier returned no output');
    }
    // Handle both cases: outputType parsed it already, or it's a raw string
    if (typeof result.finalOutput === 'object') {
        return JobAnalysisSchema.parse(result.finalOutput);
    }
    // Parse raw JSON string output
    const raw = String(result.finalOutput).trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
        throw new Error(`Could not extract JSON from AI response: ${raw.slice(0, 200)}`);
    return JobAnalysisSchema.parse(JSON.parse(jsonMatch[0]));
}
//# sourceMappingURL=ai-classifier.service.js.map