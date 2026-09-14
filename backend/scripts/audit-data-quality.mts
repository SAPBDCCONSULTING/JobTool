import { prisma } from '/Users/aryan/projects/jobTool/backend/src/lib/prisma.js';

// Description length distribution by source
const rows = await prisma.$queryRawUnsafe<any[]>(
  `SELECT r.source,
          COUNT(*)::int AS jobs,
          COUNT(*) FILTER (WHERE LENGTH(c.\"jobDescription\") < 200)::int AS under200,
          ROUND(AVG(LENGTH(c.\"jobDescription\")))::int AS avg_len
   FROM clean_jobs c JOIN raw_jobs r ON r.id = c.\"rawJobId\"
   GROUP BY r.source ORDER BY under200 DESC`,
);
console.log('=== description quality by source (jobs / under-200-chars / avg-len) ===');
for (const r of rows) console.log(` - ${r.source.padEnd(24)} ${r.jobs}\t${r.under200}\t${r.avg_len}`);

// Sample of short descriptions
const samples = await prisma.cleanJob.findMany({
  where: { jobDescription: { lt: 'x'.repeat(80) } },
  select: { jobTitle: true, jobDescription: true, rawJob: { select: { source: true } } },
  take: 6,
  orderBy: { createdAt: 'desc' },
});
console.log('=== short description samples ===');
for (const s of samples) {
  console.log(` [${s.rawJob?.source}] ${s.jobTitle.slice(0, 50)} => ${JSON.stringify(s.jobDescription.slice(0, 70))}`);
}

// A real duplicate cluster: BCG Platinion titles side by side
const bcg = await prisma.cleanJob.findMany({
  where: { companyName: 'BCG Platinion' },
  select: { jobTitle: true, country: true, url: true },
  take: 8,
});
console.log('=== BCG Platinion titles ===');
for (const b of bcg) console.log(` - [${b.country}] ${b.jobTitle.slice(0, 80)} | ${b.url?.slice(0, 60)}`);

await prisma.$disconnect();
