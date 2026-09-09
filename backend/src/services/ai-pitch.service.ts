import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { logger } from '../lib/logger.js';

const PitchSchema = z.object({
  angles: z.array(z.string()).min(2).max(5),
  emailSubject: z.string(),
  emailBody: z.string(),
  personalizationNotes: z.string(),
  callToAction: z.string(),
});

export type PitchResult = z.infer<typeof PitchSchema>;

const pitchAgent = new Agent({
  name: 'OutboundPitchWriter',
  model: 'gpt-4o-mini',
  instructions: `You are an expert B2B outbound copywriter for enterprise SAP, ERP, Cloud, and Data & Analytics consulting.

Given a qualified sales opportunity (company, hiring signals, recommended offering, why-now), write a personalized first-touch email and pitch angles.

Respond with ONLY valid JSON — no markdown:
{
  "angles": ["short pitch angle 1", "angle 2", "angle 3"],
  "emailSubject": "<compelling subject under 70 chars, no spammy ALL CAPS>",
  "emailBody": "<email body, 120-180 words, plain text, professional, specific to their hiring signals>",
  "personalizationNotes": "<1-2 sentences: what facts were used to personalize>",
  "callToAction": "<single clear CTA, e.g. 20-min discovery call>"
}

Rules:
- Reference concrete hiring / transformation signals (not generic flattery)
- Tie the recommended offering to why-now urgency
- Do NOT invent fake mutual connections, case studies with named clients, or unverifiable claims
- Do NOT invent email addresses — only use contact emails if provided in the input
- Tone: consultative peer, not hard sell
- Sign-off as: Best regards,\\n[Your Name]\\n[Your Company]`,
  outputType: PitchSchema,
});

export async function generatePitch(input: {
  companyName: string;
  country: string;
  score: number;
  stage: string;
  recommendedOffering: string;
  offeringCode: string | null;
  whyNow: string | null;
  topDomain: string | null;
  jobCount: number;
  signals: string[];
  whatToSell: string | null;
  contactEmails?: string[];
}): Promise<PitchResult> {
  const emailsLine =
    input.contactEmails && input.contactEmails.length > 0
      ? input.contactEmails.join(', ')
      : 'none found in job postings';

  const userMessage = `Company: ${input.companyName}
Country: ${input.country}
Opportunity stage: ${input.stage}
Score: ${input.score.toFixed(2)}
Top domain: ${input.topDomain || 'unknown'}
Job count: ${input.jobCount}
Recommended offering: ${input.recommendedOffering}
Offering code: ${input.offeringCode || 'n/a'}
Why now: ${input.whyNow || 'n/a'}
What to sell (from company AI): ${input.whatToSell || 'n/a'}
Hiring signals: ${input.signals.length ? input.signals.join('; ') : 'n/a'}
Contact emails found in jobs: ${emailsLine}`;


  logger.debug(
    { company: input.companyName, country: input.country },
    'Generating AI pitch',
  );

  const result = await run(pitchAgent, userMessage);

  if (!result.finalOutput) {
    throw new Error('AI pitch generator returned no output');
  }

  if (typeof result.finalOutput === 'object') {
    return PitchSchema.parse(result.finalOutput);
  }

  const raw = String(result.finalOutput).trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Could not extract JSON from pitch AI response: ${raw.slice(0, 200)}`);

  return PitchSchema.parse(JSON.parse(jsonMatch[0]));
}
