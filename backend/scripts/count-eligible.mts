import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';

async function main() {
  const cutoff = new Date(Date.now() - env.JOB_STALE_DAYS * 24 * 60 * 60 * 1000);
  const count = await prisma.$queryRaw<{ n: bigint }[]>(Prisma.sql`
    SELECT COUNT(*) AS n FROM clean_jobs
    WHERE "descriptionFetched" = false
      AND url IS NOT NULL
      AND "lifecycleStatus" = 'ACTIVE'
      AND "aiStatus" = 'DONE'
      AND "relevanceScore" >= ${env.MIN_JOB_RELEVANCE}
      AND char_length(COALESCE("jobDescription", '')) < 200
      AND "lastSeenAt" >= ${cutoff}
  `);
  console.log('truly eligible:', count[0].n);
  await prisma.$disconnect();
}
main();
