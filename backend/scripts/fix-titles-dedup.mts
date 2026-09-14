import { prisma } from '/Users/aryan/projects/jobTool/backend/src/lib/prisma.js';
import { cleanJobTitle, jobHash, normalizeText } from '/Users/aryan/projects/jobTool/backend/src/services/normalize.js';

/**
 * One-time backfill:
 *  1. Clean all canonical job titles (strip date prefixes / "- Company" suffixes)
 *  2. Recompute jobHash from the cleaned titles
 *  3. Merge duplicate clusters (same companyId + same cleaned title):
 *     re-point occurrences to the oldest canonical, retire duplicates (INACTIVE).
 */

const companies = await prisma.company.findMany({ select: { id: true, name: true, normalizedName: true } });
const companyNormById = new Map(companies.map((c) => [c.id, c.normalizedName]));

// ── Step 1: clean titles + recompute hashes ──────────────────────────────────
const jobs = await prisma.cleanJob.findMany({
  include: { rawJob: { select: { location: true } } },
});

let titlesFixed = 0;
const jobKeyById = new Map<string, string>(); // companyId + '\n' + lower(cleaned title)
const survivorByJobKey = new Map<string, { id: string; createdAt: Date }>();

for (const job of jobs) {
  const companyNorm = job.companyId ? companyNormById.get(job.companyId) ?? '' : '';
  const finalTitle = cleanJobTitle(job.jobTitle, job.companyName) || job.jobTitle;

  const newHash = jobHash(companyNorm, finalTitle, job.rawJob?.location ?? null);
  const updates: Record<string, unknown> = { jobHash: newHash };
  if (finalTitle !== job.jobTitle) {
    updates.jobTitle = finalTitle;
    titlesFixed++;
  }
  await prisma.cleanJob.update({ where: { id: job.id }, data: updates });

  const key = `${job.companyId ?? ''}\n${normalizeText(finalTitle)}`;
  jobKeyById.set(job.id, key);
  const existing = survivorByJobKey.get(key);
  if (!existing || job.createdAt < existing.createdAt) {
    survivorByJobKey.set(key, { id: job.id, createdAt: job.createdAt });
  }
}
console.log(`titles cleaned: ${titlesFixed} / ${jobs.length}`);

// ── Step 2: merge duplicate clusters ─────────────────────────────────────────
let mergedClusters = 0;
let retiredDupes = 0;
const seenSurvivors = new Map<string, string>(); // jobKey -> survivorId (respect oldest)

// Rebuild survivor map honoring createdAt (oldest wins)
const byKey = new Map<string, typeof jobs>();
for (const job of jobs) {
  const key = jobKeyById.get(job.id)!;
  if (!key || key === '\n') continue;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key)!.push(job);
}

for (const [key, cluster] of byKey) {
  if (cluster.length < 2) continue;
  const sorted = [...cluster].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const survivor = sorted[0];
  seenSurvivors.set(key, survivor.id);
  mergedClusters++;
  for (const dup of sorted.slice(1)) {
    // Re-point every occurrence (including the dup's origin raw) to the survivor
    await prisma.rawJob.updateMany({
      where: { canonicalJobId: dup.id },
      data: { canonicalJobId: survivor.id },
    });
    // Retire the duplicate
    await prisma.cleanJob.update({
      where: { id: dup.id },
      data: { lifecycleStatus: 'INACTIVE' },
    });
    retiredDupes++;
  }
}

const remainingActive = await prisma.cleanJob.count({ where: { lifecycleStatus: 'ACTIVE' } });
console.log({ mergedClusters, retiredDupes, remainingActive });
await prisma.$disconnect();
