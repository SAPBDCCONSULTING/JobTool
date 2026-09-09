-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('NEW', 'QUALIFIED', 'NURTURE', 'DISQUALIFIED', 'CONTACTED', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "companyIntelligenceId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'NEW',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL,
    "recommendedOffering" TEXT NOT NULL,
    "offeringCode" TEXT,
    "whyNow" TEXT,
    "qualificationReason" TEXT,
    "topDomain" TEXT,
    "jobCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stageUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_companyIntelligenceId_key" ON "opportunities"("companyIntelligenceId");

-- CreateIndex
CREATE INDEX "opportunities_stage_idx" ON "opportunities"("stage");

-- CreateIndex
CREATE INDEX "opportunities_score_idx" ON "opportunities"("score");

-- CreateIndex
CREATE INDEX "opportunities_rank_idx" ON "opportunities"("rank");

-- CreateIndex
CREATE INDEX "opportunities_country_idx" ON "opportunities"("country");

-- CreateIndex
CREATE INDEX "opportunities_companyName_idx" ON "opportunities"("companyName");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_companyIntelligenceId_fkey" FOREIGN KEY ("companyIntelligenceId") REFERENCES "company_intelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
