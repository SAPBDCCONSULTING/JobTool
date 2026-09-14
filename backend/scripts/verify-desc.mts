import { prisma } from '../src/lib/prisma.js';

async function main() {
  const jobs = await prisma.cleanJob.findMany({
    where: { descriptionFetched: true, jobDescription: { not: '' } },
    select: { jobTitle: true, jobDescription: true, aiStatus: true, relevanceScore: true, rawJob: { select: { source: true } } },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log('enriched samples (most recent):');
  for (const j of jobs) {
    console.log('-', (j.rawJob?.source ?? '?').padEnd(14), (j.jobTitle ?? '').slice(0, 45), '| descLen:', j.jobDescription.length, '| score:', j.relevanceScore, '| ai:', j.aiStatus);
  }
  await prisma.$disconnect();
}
main();
