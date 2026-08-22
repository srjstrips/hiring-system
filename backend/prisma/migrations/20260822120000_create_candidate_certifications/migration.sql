-- CreateTable
CREATE TABLE "candidate_certifications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileOriginalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_certifications_candidateId_idx" ON "candidate_certifications"("candidateId");

-- AddForeignKey
ALTER TABLE "candidate_certifications" ADD CONSTRAINT "candidate_certifications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
