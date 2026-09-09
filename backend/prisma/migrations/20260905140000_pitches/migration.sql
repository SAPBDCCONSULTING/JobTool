-- CreateTable
CREATE TABLE "pitches" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "angles" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "personalizationNotes" TEXT,
    "callToAction" TEXT,
    "aiStatus" "AiStatus" NOT NULL DEFAULT 'PENDING',
    "aiProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pitches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pitches_opportunityId_key" ON "pitches"("opportunityId");

-- CreateIndex
CREATE INDEX "pitches_aiStatus_idx" ON "pitches"("aiStatus");

-- CreateIndex
CREATE INDEX "pitches_companyName_idx" ON "pitches"("companyName");

-- CreateIndex
CREATE INDEX "pitches_country_idx" ON "pitches"("country");

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
