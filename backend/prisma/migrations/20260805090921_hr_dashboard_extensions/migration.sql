/*
  Warnings:

  - You are about to drop the column `employeeId` on the `joining_checklists` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "JobPositionStatus" AS ENUM ('OPEN', 'ON_HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "JoiningStatus" AS ENUM ('PENDING', 'JOINED', 'ONBOARDING', 'COMPLETED', 'NOT_JOINED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'NOTICE_PERIOD', 'EXITED');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('NOTICE_STARTED', 'NOTICE_IN_PROGRESS', 'NOTICE_COMPLETED', 'EXITED_EARLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApprovalStatus" ADD VALUE 'DRAFT';
ALTER TYPE "ApprovalStatus" ADD VALUE 'CLOSED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InterviewStatus" ADD VALUE 'SHORTLISTED';
ALTER TYPE "InterviewStatus" ADD VALUE 'REJECTED';
ALTER TYPE "InterviewStatus" ADD VALUE 'BACKOUT';
ALTER TYPE "InterviewStatus" ADD VALUE 'ON_HOLD';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "ownedById" TEXT;

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "ownedById" TEXT;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "filledPositions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hiringManagerId" TEXT,
ADD COLUMN     "ownedById" TEXT,
ADD COLUMN     "positionStatus" "JobPositionStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "joining_checklists" DROP COLUMN "employeeId",
ADD COLUMN     "employeeCode" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "status" "JoiningStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "user_departments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "designationId" TEXT NOT NULL,
    "hrOwnerId" TEXT,
    "employeeCode" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "noticeStartDate" TIMESTAMP(3),
    "noticeEndDate" TIMESTAMP(3),
    "noticeStatus" "NoticeStatus",
    "exitReason" TEXT,
    "exitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_departments_userId_departmentId_key" ON "user_departments"("userId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "user_locations_userId_locationId_key" ON "user_locations"("userId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_applicationId_key" ON "employees"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_hiringManagerId_fkey" FOREIGN KEY ("hiringManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_ownedById_fkey" FOREIGN KEY ("ownedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_ownedById_fkey" FOREIGN KEY ("ownedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_ownedById_fkey" FOREIGN KEY ("ownedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joining_checklists" ADD CONSTRAINT "joining_checklists_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_hrOwnerId_fkey" FOREIGN KEY ("hrOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
