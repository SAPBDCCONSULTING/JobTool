-- AlterEnum: human feedback stages on opportunities
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'REVIEWED';
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'REPLIED';
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'MEETING';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FeedbackOutcome" AS ENUM ('REVIEWED', 'CONTACTED', 'REPLIED', 'MEETING', 'WON', 'LOST');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "feedback_events" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "outcome" "FeedbackOutcome" NOT NULL,
    "notes" TEXT,
    "recordedBy" TEXT DEFAULT 'team',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "feedback_events_opportunityId_idx" ON "feedback_events"("opportunityId");
CREATE INDEX IF NOT EXISTS "feedback_events_outcome_idx" ON "feedback_events"("outcome");
CREATE INDEX IF NOT EXISTS "feedback_events_createdAt_idx" ON "feedback_events"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
