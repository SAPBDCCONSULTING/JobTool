-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('APIFY', 'SCRAPER');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "clean_jobs" DROP CONSTRAINT "clean_jobs_rawJobId_fkey";

-- AlterTable
ALTER TABLE "clean_jobs" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "jobHash" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lifecycleStatus" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "raw_jobs" ADD COLUMN     "canonicalJobId" TEXT,
ADD COLUMN     "keywordId" TEXT,
ADD COLUMN     "sourceRunId" TEXT,
ADD COLUMN     "url" TEXT;

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'tech',
    "location" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "scheduleHours" INTEGER NOT NULL DEFAULT 6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL DEFAULT 'SCRAPER',
    "country" TEXT,
    "website" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_runs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "keywordId" TEXT,
    "runType" TEXT NOT NULL DEFAULT 'scheduled',
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "itemsFetched" INTEGER NOT NULL DEFAULT 0,
    "itemsNew" INTEGER NOT NULL DEFAULT 0,
    "itemsDup" INTEGER NOT NULL DEFAULT 0,
    "itemsFiltered" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "domain" TEXT,
    "country" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "keywords_term_key" ON "keywords"("term");

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

-- CreateIndex
CREATE INDEX "source_runs_sourceId_status_idx" ON "source_runs"("sourceId", "status");

-- CreateIndex
CREATE INDEX "source_runs_keywordId_status_idx" ON "source_runs"("keywordId", "status");

-- CreateIndex
CREATE INDEX "source_runs_createdAt_idx" ON "source_runs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "companies_normalizedName_key" ON "companies"("normalizedName");

-- CreateIndex
CREATE INDEX "clean_jobs_jobHash_idx" ON "clean_jobs"("jobHash");

-- CreateIndex
CREATE INDEX "clean_jobs_companyId_lifecycleStatus_lastSeenAt_idx" ON "clean_jobs"("companyId", "lifecycleStatus", "lastSeenAt");

-- CreateIndex
CREATE INDEX "clean_jobs_lifecycleStatus_lastSeenAt_idx" ON "clean_jobs"("lifecycleStatus", "lastSeenAt");

-- CreateIndex
CREATE INDEX "raw_jobs_canonicalJobId_idx" ON "raw_jobs"("canonicalJobId");

-- CreateIndex
CREATE INDEX "raw_jobs_keywordId_idx" ON "raw_jobs"("keywordId");

-- CreateIndex
CREATE INDEX "raw_jobs_sourceRunId_idx" ON "raw_jobs"("sourceRunId");

-- AddForeignKey
ALTER TABLE "source_runs" ADD CONSTRAINT "source_runs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_runs" ADD CONSTRAINT "source_runs_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_jobs" ADD CONSTRAINT "raw_jobs_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_jobs" ADD CONSTRAINT "raw_jobs_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "source_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_jobs" ADD CONSTRAINT "raw_jobs_canonicalJobId_fkey" FOREIGN KEY ("canonicalJobId") REFERENCES "clean_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clean_jobs" ADD CONSTRAINT "clean_jobs_rawJobId_fkey" FOREIGN KEY ("rawJobId") REFERENCES "raw_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clean_jobs" ADD CONSTRAINT "clean_jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
