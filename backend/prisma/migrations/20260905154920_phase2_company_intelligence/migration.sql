-- AlterTable
ALTER TABLE "clean_jobs" ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "outsourcingPotential" DOUBLE PRECISION,
ADD COLUMN     "projectType" TEXT,
ADD COLUMN     "promptVersion" TEXT,
ADD COLUMN     "relevanceScore" INTEGER,
ADD COLUMN     "roleCategory" TEXT,
ADD COLUMN     "seniority" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "needsRecalc" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "company_intelligence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "activeJobs" INTEGER NOT NULL DEFAULT 0,
    "jobs7d" INTEGER NOT NULL DEFAULT 0,
    "jobs30d" INTEGER NOT NULL DEFAULT 0,
    "topTechnologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notableRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avgRelevance" DOUBLE PRECISION,
    "avgOutsourcing" DOUBLE PRECISION,
    "likelyInitiative" TEXT,
    "initiativeConfidence" DOUBLE PRECISION,
    "recommendedServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT,
    "score" DOUBLE PRECISION,
    "scoreBreakdown" JSONB,
    "scoreExplanation" TEXT,
    "formulaVersion" TEXT,
    "model" TEXT,
    "recalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_intelligence_companyId_key" ON "company_intelligence"("companyId");

-- AddForeignKey
ALTER TABLE "company_intelligence" ADD CONSTRAINT "company_intelligence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
