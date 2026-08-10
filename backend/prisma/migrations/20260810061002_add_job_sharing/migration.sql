-- CreateEnum
CREATE TYPE "JobSharePlatform" AS ENUM ('LINKEDIN', 'NAUKRI');

-- CreateEnum
CREATE TYPE "JobShareStatus" AS ENUM ('NOT_SHARED', 'PENDING', 'POSTED', 'FAILED', 'REMOVED');

-- CreateTable
CREATE TABLE "job_shares" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "platform" "JobSharePlatform" NOT NULL,
    "status" "JobShareStatus" NOT NULL DEFAULT 'NOT_SHARED',
    "externalJobId" TEXT,
    "externalJobUrl" TEXT,
    "errorMessage" TEXT,
    "sharedAt" TIMESTAMP(3),
    "sharedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_share_history" (
    "id" TEXT NOT NULL,
    "jobShareId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "platform" "JobSharePlatform" NOT NULL,
    "status" "JobShareStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "externalJobId" TEXT,
    "externalJobUrl" TEXT,
    "errorMessage" TEXT,
    "actedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_share_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_shares_jobId_idx" ON "job_shares"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "job_shares_jobId_platform_key" ON "job_shares"("jobId", "platform");

-- CreateIndex
CREATE INDEX "job_share_history_jobId_idx" ON "job_share_history"("jobId");

-- CreateIndex
CREATE INDEX "job_share_history_jobShareId_idx" ON "job_share_history"("jobShareId");

-- AddForeignKey
ALTER TABLE "job_shares" ADD CONSTRAINT "job_shares_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_shares" ADD CONSTRAINT "job_shares_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_share_history" ADD CONSTRAINT "job_share_history_jobShareId_fkey" FOREIGN KEY ("jobShareId") REFERENCES "job_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
