-- CreateTable
CREATE TABLE "company_intelligence" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "opportunityScore" DOUBLE PRECISION,
    "whyNow" TEXT,
    "whatToSell" TEXT,
    "signals" TEXT,
    "aiStatus" "AiStatus" NOT NULL DEFAULT 'PENDING',
    "jobCountAtAnalysis" INTEGER NOT NULL DEFAULT 0,
    "avgJobConfidence" DOUBLE PRECISION,
    "topDomain" TEXT,
    "aiProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_intelligence_aiStatus_idx" ON "company_intelligence"("aiStatus");

-- CreateIndex
CREATE INDEX "company_intelligence_opportunityScore_idx" ON "company_intelligence"("opportunityScore");

-- CreateIndex
CREATE UNIQUE INDEX "company_intelligence_companyName_country_key" ON "company_intelligence"("companyName", "country");
