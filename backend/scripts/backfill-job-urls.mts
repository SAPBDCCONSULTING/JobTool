import { prisma } from '/Users/aryan/projects/jobTool/backend/src/lib/prisma.js';

// LinkedIn: reconstruct posting URLs from numeric job ids
const r1 = await prisma.$executeRawUnsafe(
  "UPDATE raw_jobs SET url = 'https://www.linkedin.com/jobs/view/' || \"jobId\" " +
    "WHERE source IN ('linkedin-apify', 'apify') AND url IS NULL AND \"jobId\" ~ '^\\d+$'",
);
console.log('linkedin raw urls reconstructed:', r1);

// Propagate to canonical jobs missing a url
const r2 = await prisma.$executeRawUnsafe(
  `UPDATE clean_jobs c SET url = occ.url
   FROM (SELECT "canonicalJobId", MIN(url) AS url FROM raw_jobs
         WHERE "canonicalJobId" IS NOT NULL AND url IS NOT NULL AND url <> ''
         GROUP BY "canonicalJobId") occ
   WHERE c.id = occ."canonicalJobId" AND (c.url IS NULL OR c.url = '')`,
);
console.log('canonical urls backfilled:', r2);

const total = await prisma.cleanJob.count();
const withUrl = await prisma.cleanJob.count({ where: { url: { not: null } } });
console.log({ total, withUrl, stillWithoutUrl: total - withUrl });
await prisma.$disconnect();
