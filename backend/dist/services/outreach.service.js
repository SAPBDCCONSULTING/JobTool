import { Agent, run } from '@openai/agents';
import { z } from 'zod';
const OutreachSchema = z.object({
    subject: z.string(),
    body: z.string(),
});
export const OUTREACH_PROMPT_VERSION = 'outreach-v1';
export const OUTREACH_MODEL = 'gpt-4o-mini';
const outreachAgent = new Agent({
    name: 'SalesOutreachWriter',
    model: OUTREACH_MODEL,
    instructions: `You are a business-development writer for an SAP/ERP/Cloud/Data consulting firm.

Write a short, personalized cold outreach email to a company that is showing strong hiring signals. Reference their observed activity naturally (never list raw metrics), propose a relevant service, and ask for a brief call.

Rules:
- Keep the body under 180 words, professional and consultative (not pushy/spammy).
- No placeholders like [Name], [Company], [Your Name]. Use a generic but polished sign-off.
- Only claim what the provided signals support.
- Output ONLY JSON: { "subject": "...", "body": "..." }`,
    outputType: OutreachSchema,
});
export async function generateOutreach(ctx) {
    const initiative = ctx.likelyInitiative ?? 'enterprise technology transformation';
    const services = ctx.recommendedServices.join(', ') || 'SAP consulting and delivery services';
    const evidence = ctx.evidence.slice(0, 4).join('; ') || 'recent hiring activity';
    const tech = ctx.topTechnologies.join(', ') || 'SAP/ERP technologies';
    const input = `Company: ${ctx.companyName}${ctx.country ? ` (${ctx.country})` : ''}
Likely initiative: ${initiative}
Recommended services: ${services}
Observed signals: ${evidence}
Technologies in demand: ${tech}
Active relevant roles: ${ctx.activeJobs ?? 'several'}`;
    const result = await run(outreachAgent, input);
    if (!result.finalOutput)
        throw new Error('Outreach AI returned no output');
    if (typeof result.finalOutput === 'object') {
        return OutreachSchema.parse(result.finalOutput);
    }
    const raw = String(result.finalOutput).trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
        throw new Error(`Could not extract JSON from outreach AI: ${raw.slice(0, 200)}`);
    return OutreachSchema.parse(JSON.parse(jsonMatch[0]));
}
//# sourceMappingURL=outreach.service.js.map