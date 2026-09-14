import { prisma } from '../src/lib/prisma.js';

/**
 * One-time backfill: re-parse legacy jobs.ch jobs whose titles contain the
 * full card blob ("3 months ago<TITLE>Place of work:<LOC>Workload:<W>Contract
 * type:Permanent position <COMPANY>...") and whose company came through as
 * "Unknown". Applies the same parsing logic as the fixed Python parser.
 */

const DATE_PREFIX = /^\s*[(\[]?\s*(?:(?:\d+\s+(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\s+ago)|(?:last\s+(?:week|month))|yesterday|today|just\s+posted)\s*[)\]]?\s*/i;

function parseCard(text: string): { title: string; company: string; location: string; publishedAt: string } {
  const out = { title: '', company: '', location: '', publishedAt: '' };
  const blob = text.replace(/\s+/g, ' ').trim();

  const dm = blob.match(DATE_PREFIX);
  if (dm) {
    out.publishedAt = relativeToIso(dm[0]);
    // remove the matched prefix from blob
    // (we don't actually need the mutated blob since we match on the spliced title)
  }
  const body = dm ? blob.slice(dm[0].length) : blob;

  const cut = body.indexOf('Place of work:');
  const titlePart = cut !== -1 ? body.slice(0, cut) : body;
  const meta = cut !== -1 ? body.slice(cut) : '';
  out.title = (titlePart || '').trim().replace(/^[\s\-–—:|]+|[\s\-–—:|]+$/g, '');

  const loc = meta.match(/Place of work:\s*(.*?)\s*Workload:/);
  if (loc) out.location = loc[1].trim();

  const comp = meta.match(/position\s*(.*?)(?:\s+Is this job relevant.*)?$/);
  if (comp) {
    out.company = (comp[1] as string)
      .replace(/\s*(?:promoted|Easy apply|New)\s*$/, '')
      .trim();
  }
  return out;
}

function relativeToIso(text: string): string {
  const now = new Date();
  const m = text.match(/(\d+)\s+(minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\s+ago/i);
  if (m) {
    const qty = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const ms = {
      minute: qty * 60_000, min: qty * 60_000,
      hour: qty * 3_600_000, hr: qty * 3_600_000,
      day: qty * 86_400_000,
      week: qty * 604_800_000,
      month: qty * 2_592_000_000,
    };
    return new Date(now.getTime() - (ms[unit] ?? qty * 86_400_000)).toISOString();
  }
  const low = text.toLowerCase();
  if (low.includes('yesterday')) return new Date(now.getTime() - 86_400_000).toISOString();
  if (low.includes('today') || low.includes('just posted')) return now.toISOString();
  if (/last\s+week/.test(low)) return new Date(now.getTime() - 604_800_000).toISOString();
  if (/last\s+month/.test(low)) return new Date(now.getTime() - 2_592_000_000).toISOString();
  return '';
}

async function resolveCompany(name: string): Promise<{ id: string } | null> {
  if (!name || name === 'Unknown') return null;
  const { resolveCompany } = await import('../src/services/company.service.js');
  return resolveCompany(name, 'Switzerland');
}

async function main() {
  const jobs = await prisma.cleanJob.findMany({
    where: {
      companyName: 'Unknown',
      rawJob: { is: { source: 'jobs.ch' } },
    },
    include: { rawJob: { select: { location: true } } },
  });
  console.log(`jobs.ch Unknown-company jobs found: ${jobs.length}`);

  let fixed = 0;
  for (const job of jobs) {
    const parsed = parseCard(job.jobTitle);
    if (!parsed.title && !parsed.company && !parsed.location) continue;

    const companyId = parsed.company ? await resolveCompany(parsed.company) : null;
    await prisma.cleanJob.update({
      where: { id: job.id },
      data: {
        jobTitle: parsed.title || job.jobTitle,
        companyName: parsed.company || job.companyName,
        companyId: companyId?.id ?? job.companyId,
        country: job.country || 'Switzerland',
      },
    });
    // Also fix the origin raw + any occurrence raws for this canonical
    await prisma.rawJob.updateMany({
      where: { canonicalJobId: job.id },
      data: {
        jobTitle: parsed.title || job.jobTitle,
        companyName: parsed.company || job.companyName,
        location: parsed.location || job.rawJob?.location || null,
        publishedAt: parsed.publishedAt || null,
      },
    });
    fixed++;
  }
  console.log(`fixed: ${fixed}`);
  await prisma.$disconnect();
}

main();