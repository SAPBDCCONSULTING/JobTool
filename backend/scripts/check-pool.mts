import { Prisma } from '@prisma/client';
import { prisma } from '/Users/aryan/projects/jobTool/backend/src/lib/prisma.js';
import { env } from '/Users/aryan/projects/jobTool/backend/src/config/env.js';

async function main() {
  const cutoff = new Date(Date.now() - env.JOB_STALE_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<{ id: string; title: string | null; source: string | null }[]>(Prisma.sql`
    SELECT cj.id, cj."jobTitle" AS title, rj.source AS source
    FROM clean_jobs cj LEFT JOIN raw_jobs rj ON rj.id = cj."rawJobId"
    WHERE cj."descriptionFetched" = false
      AND cj.url IS NOT NULL
      AND cj."lifecycleStatus" = 'ACTIVE'
      AND cj."aiStatus" = 'DONE'
      AND cj."relevanceScore" >= ${env.MIN_JOB_RELEVANCE}
      AND char_length(COALESCE(cj."jobDescription", '')) < 200
      AND cj."lastSeenAt" >= ${cutoff}
    ORDER BY cj."createdAt" DESC
    LIMIT 8
  `);
  console.log('eligible sample:', rows.length);
  for (const r of rows) console.log('-', (r.source ?? '?').padEnd(14), (r.title ?? '').slice(0, 55));
  await prisma.$disconnect();
}

main();