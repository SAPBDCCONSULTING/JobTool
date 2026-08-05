import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { logger } from '../lib/logger.js';

// ─── Output schema ────────────────────────────────────────────
const ClassificationSchema = z.object({
  is_primary: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

// ─── Agent definition (created once, reused across calls) ────
const classifierAgent = new Agent({
  name: 'HiringIntentClassifier',
  model: 'gpt-4o-mini',
  instructions: `You are an expert hiring intent classifier for enterprise technology consulting.

Your task: analyze a job posting and determine if it signals that the company is ACTIVELY INVESTING in SAP, ERP, Cloud, or Data & Analytics systems.

You MUST respond with ONLY a valid JSON object — no markdown, no explanation outside JSON:
{
  "is_primary": <boolean>,
  "confidence": <float 0.0-1.0>,
  "reason": "<1-2 sentences>"
}

Definitions:
- is_primary: true if this is a hands-on technical or leadership role (architect, consultant, developer, analyst, engineer, project manager for these systems). false if it's support, training, sales, or peripheral.
- confidence: how strongly does this job signal the company is investing in these tech areas?
  - 0.9-1.0: Direct implementation — "SAP S/4HANA Lead Consultant", "Cloud Migration Architect"
  - 0.7-0.89: Strong signal — "ERP Project Manager", "Data Engineer building new platform"
  - 0.5-0.69: Moderate signal — "IT Manager overseeing cloud systems"
  - 0.3-0.49: Weak signal — "IT Support with SAP exposure"
  - 0.0-0.29: No meaningful signal

Focus on: technology-specific roles that indicate NEW investment or transformation, not routine maintenance.`,
  outputType: ClassificationSchema,
});

export async function classifyJob(job: {
  jobTitle: string;
  jobDescription: string;
  companyName: string;
}): Promise<ClassificationResult> {
  const userMessage = `Company: ${job.companyName}
Job Title: ${job.jobTitle}

Job Description:
${job.jobDescription.slice(0, 3000)}`;

  logger.debug({ jobTitle: job.jobTitle, company: job.companyName }, 'Classifying job with AI');

  const result = await run(classifierAgent, userMessage);

  if (!result.finalOutput) {
    throw new Error('AI classifier returned no output');
  }

  // Handle both cases: outputType parsed it already, or it's a raw string
  if (typeof result.finalOutput === 'object') {
    return ClassificationSchema.parse(result.finalOutput);
  }

  // Parse raw JSON string output
  const raw = String(result.finalOutput).trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Could not extract JSON from AI response: ${raw.slice(0, 200)}`);

  return ClassificationSchema.parse(JSON.parse(jsonMatch[0]));
}
