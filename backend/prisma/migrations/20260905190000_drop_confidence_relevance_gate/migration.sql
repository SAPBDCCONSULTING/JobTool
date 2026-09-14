-- Drop the confidence column (replaced by AI relevanceScore)
DROP INDEX IF EXISTS "clean_jobs_confidence_idx";
ALTER TABLE "clean_jobs" DROP COLUMN IF EXISTS "confidence";

-- Relevance-based ordering/filtering support
CREATE INDEX IF NOT EXISTS "clean_jobs_relevanceScore_idx" ON "clean_jobs"("relevanceScore");
