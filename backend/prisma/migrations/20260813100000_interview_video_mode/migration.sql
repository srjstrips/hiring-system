-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('VIDEO', 'IN_PERSON');

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN "mode" "InterviewMode" NOT NULL DEFAULT 'VIDEO';
