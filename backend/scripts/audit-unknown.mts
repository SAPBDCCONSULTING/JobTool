import { prisma } from '../src/lib/prisma.js';

async function main() {
  const jobs = await prisma.cleanJob.findMany({
    where: { lifecycleStatus: 'ACTIVE' },
    select: { id: true, companyName: true, rawJob: { select: { source: true, companyName: true } } },
  });
  const active = jobs.length;
  const unknown = jobs.filter((j) => (j.companyName || '').toLowerCase() === 'unknown' || !j.companyName);
  console.log('active:', active, '| unknown-company:', unknown.length);
  const bySrc: Record<string, number> = {};
  for (const j of unknown) {
    const s = j.rawJob?.source ?? '?';
    bySrc[s] = (bySrc[s] ?? 0) + 1;
  }
  console.log('unknown by source:', JSON.stringify(bySrc, null, 1));

  // Show a few sample rows where the RAW record has a real company but canonical doesn't
  const mismatched = jobs.filter(
    (j) =>
      (j.companyName || '').toLowerCase() === 'unknown' &&
      j.rawJob?.companyName &&
      (j.rawJob.companyName.toLowerCase() !== 'unknown') &&
      j.rawJob.companyName.trim() !== '',
  );
  console.log('has real company in raw but Unknown in canonical:', mismatched.length);
  for (const m of mismatched.slice(0, 6)) {
    console.log('-', (m.rawJob?.source ?? '?'), '| canonical:', m.companyName, '| raw:', m.rawJob?.companyName);
  }
  await prisma.$disconnect();
}

main();