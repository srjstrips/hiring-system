-- CreateEnum
CREATE TYPE "CandidateType" AS ENUM ('FRESHER', 'EXPERIENCED');

-- AlterTable
ALTER TABLE "candidates"
    ADD COLUMN "candidateType" "CandidateType",
    ADD COLUMN "whatsappNumber" TEXT,
    ADD COLUMN "state" TEXT,
    ADD COLUMN "pincode" TEXT,
    ADD COLUMN "currentAddress" TEXT,
    ADD COLUMN "permanentAddress" TEXT,
    ADD COLUMN "preferredLocation" TEXT,
    ADD COLUMN "languagesKnown" TEXT,
    ADD COLUMN "willingToRelocate" BOOLEAN,
    ADD COLUMN "highestQualification" TEXT,
    ADD COLUMN "instituteName" TEXT,
    ADD COLUMN "yearOfPassing" INTEGER,
    ADD COLUMN "percentageCgpa" TEXT,
    ADD COLUMN "photoUrl" TEXT,
    ADD COLUMN "aadharNumber" TEXT,
    ADD COLUMN "panNumber" TEXT;
