-- CreateTable
CREATE TABLE "candidate_notifications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT,
    "jobSlug" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_notifications_candidateId_isRead_idx" ON "candidate_notifications"("candidateId", "isRead");

-- AddForeignKey
ALTER TABLE "candidate_notifications" ADD CONSTRAINT "candidate_notifications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_notifications" ADD CONSTRAINT "candidate_notifications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
