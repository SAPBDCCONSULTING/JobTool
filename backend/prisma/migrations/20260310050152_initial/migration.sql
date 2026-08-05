-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "raw_jobs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyId" TEXT,
    "companyUrl" TEXT,
    "location" TEXT,
    "country" TEXT NOT NULL,
    "searchString" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'apify',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clean_jobs" (
    "id" TEXT NOT NULL,
    "rawJobId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "domain" TEXT,
    "searchString" TEXT NOT NULL,
    "aiStatus" "AiStatus" NOT NULL DEFAULT 'PENDING',
    "confidence" DOUBLE PRECISION,
    "aiReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiProcessedAt" TIMESTAMP(3),

    CONSTRAINT "clean_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "raw_jobs_country_idx" ON "raw_jobs"("country");

-- CreateIndex
CREATE INDEX "raw_jobs_companyName_idx" ON "raw_jobs"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "raw_jobs_jobId_country_key" ON "raw_jobs"("jobId", "country");

-- CreateIndex
CREATE UNIQUE INDEX "clean_jobs_rawJobId_key" ON "clean_jobs"("rawJobId");

-- CreateIndex
CREATE INDEX "clean_jobs_aiStatus_idx" ON "clean_jobs"("aiStatus");

-- CreateIndex
CREATE INDEX "clean_jobs_confidence_idx" ON "clean_jobs"("confidence");

-- CreateIndex
CREATE INDEX "clean_jobs_companyName_idx" ON "clean_jobs"("companyName");

-- CreateIndex
CREATE INDEX "clean_jobs_country_idx" ON "clean_jobs"("country");

-- AddForeignKey
ALTER TABLE "clean_jobs" ADD CONSTRAINT "clean_jobs_rawJobId_fkey" FOREIGN KEY ("rawJobId") REFERENCES "raw_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
