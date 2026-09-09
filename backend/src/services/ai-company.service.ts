import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { logger } from '../lib/logger.js';

const CompanyIntelligenceSchema = z.object({
  opportunityScore: z.number().min(0).max(1),
  whyNow: z.string(),
  whatToSell: z.string(),
  signals: z.array(z.string()).min(1).max(6),
});

export type CompanyIntelligenceResult = z.infer<typeof CompanyIntelligenceSchema>;

export interface CompanyJobSummary {
  jobTitle: string;
  domain: string | null;
  confidence: number | null;
  aiReason: string | null;
}

const companyAgent = new Agent({
  name: 'CompanyOpportunityAnalyst',
  model: 'gpt-4o-mini',
  instructions: `You are a senior enterprise sales strategist for SAP, ERP, Cloud, and Data & Analytics consulting.

Given a company's recent hiring activity (job titles, domains, job-level confidence, and AI reasons), produce a company-level opportunity assessment for outbound consulting sales.

Respond with ONLY valid JSON — no markdown:
{
  "opportunityScore": <float 0.0-1.0>,
  "whyNow": "<1-2 sentences: urgency / timing to approach this company>",
  "whatToSell": "<1-2 sentences: specific offering to pitch (e.g. S/4HANA migration, cloud landing zone, data platform)>",
  "signals": ["short hiring signal 1", "signal 2", ...]
}

opportunityScore guide:
- 0.9-1.0: Clear active transformation (multiple high-confidence implementation roles)
- 0.7-0.89: Strong buying signal (key architect / PM / consultant roles)
- 0.5-0.69: Moderate interest (mixed or fewer roles)
- 0.3-0.49: Weak / maintenance-heavy
- 0.0-0.29: Little or no relevant investment signal

Focus on NEW investment and transformation, not routine support. Be specific in whatToSell.`,
  outputType: CompanyIntelligenceSchema,
});

export async function analyzeCompany(input: {
  companyName: string;
  country: string;
  jobs: CompanyJobSummary[];
  topDomain: string | null;
  avgConfidence: number | null;
}): Promise<CompanyIntelligenceResult> {
  const jobLines = input.jobs
    .slice(0, 25)
    .map((j, i) => {
      const conf = j.confidence != null ? `${Math.round(j.confidence * 100)}%` : 'n/a';
      const domain = j.domain || 'unknown';
      const reason = (j.aiReason || '').slice(0, 180);
      return `${i + 1}. [${domain}] ${j.jobTitle} (job confidence ${conf})${reason ? ` — ${reason}` : ''}`;
    })
    .join('\n');

  const userMessage = `Company: ${input.companyName}
Country: ${input.country}
Top domain: ${input.topDomain || 'unknown'}
Avg job confidence: ${input.avgConfidence != null ? input.avgConfidence.toFixed(2) : 'n/a'}
Classified jobs (${input.jobs.length}):

${jobLines || '(no job details)'}`;

  logger.debug(
    { company: input.companyName, country: input.country, jobCount: input.jobs.length },
    'Analyzing company opportunity with AI',
  );

  const result = await run(companyAgent, userMessage);

  if (!result.finalOutput) {
    throw new Error('AI company analyst returned no output');
  }

  if (typeof result.finalOutput === 'object') {
    return CompanyIntelligenceSchema.parse(result.finalOutput);
  }

  const raw = String(result.finalOutput).trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Could not extract JSON from company AI response: ${raw.slice(0, 200)}`);

  return CompanyIntelligenceSchema.parse(JSON.parse(jsonMatch[0]));
}
