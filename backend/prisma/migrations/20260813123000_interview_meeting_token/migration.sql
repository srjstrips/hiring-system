-- AlterTable
ALTER TABLE "interviews" ADD COLUMN "meetingToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "interviews_meetingToken_key" ON "interviews"("meetingToken");
