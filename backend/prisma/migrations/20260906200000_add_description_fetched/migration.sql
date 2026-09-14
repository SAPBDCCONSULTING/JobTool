-- Track which jobs had their description fetched from the detail page
ALTER TABLE "clean_jobs" ADD COLUMN "descriptionFetched" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "clean_jobs_descriptionFetched_idx" ON "clean_jobs"("descriptionFetched");
