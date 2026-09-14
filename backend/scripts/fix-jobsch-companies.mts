import { prisma } from '../src/lib/prisma.js';

/**
 * One-time backfill (pass 2): jobs.ch company names still carry card-string
 * junk from the old parser ("Hamilton AGPromotedIs this job relevant to you?").
 * Strip the known tails and re-point the canonical at the correct company.
 */

function stripTitle(title: string): string {
  return title
    .replace(/\s+(?:promoted|easy apply|new)\s*Is this job relevant.*$/i, '')
    .replace(/\s*Is this job relevant.*$/i, '')
    .replace(/\s+(?:promoted|easy apply|new)\s*$/i, '')
    .trim();
}

async function main() {
  const jobs = await prisma.cleanJob.findMany({
    where: { rawJob: { is: { source: 'jobs.ch' } } },
    select: { id: true, companyName: true },
  });

  let fixed = 0;
  for (const job of jobs) {
    const cleaned = stripTitle(job.companyName);
    if (cleaned === job.companyName) continue;

    const { resolveCompany } = await import('../src/services/company.service.js');
    const company = await resolveCompany(cleaned, 'Switzerland');
    await prisma.cleanJob.update({
      where: { id: job.id },
      data: { companyName: cleaned, companyId: company?.id ?? null },
    });
    await prisma.rawJob.updateMany({
      where: { canonicalJobId: job.id },
      data: { companyName: cleaned },
    });
    fixed++;
  }
  console.log(`company names fixed: ${fixed}`);
  await prisma.$disconnect();
}

main();