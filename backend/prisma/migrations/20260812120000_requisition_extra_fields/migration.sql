-- CreateEnum
CREATE TYPE "RequisitionRaisedFrom" AS ENUM ('DEPARTMENT', 'PLANT', 'CORPORATE_HEAD_OFFICE', 'MANAGEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "sub_departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sub_departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sub_departments_departmentId_name_key" ON "sub_departments"("departmentId", "name");

-- AddForeignKey
ALTER TABLE "sub_departments" ADD CONSTRAINT "sub_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "manpower_requisitions"
ADD COLUMN "subDepartmentId" TEXT,
ADD COLUMN "remark" TEXT,
ADD COLUMN "replacementAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "replacementEmployeeName" TEXT,
ADD COLUMN "hodName" TEXT,
ADD COLUMN "raisedFrom" "RequisitionRaisedFrom";

-- AddForeignKey
ALTER TABLE "manpower_requisitions" ADD CONSTRAINT "manpower_requisitions_subDepartmentId_fkey" FOREIGN KEY ("subDepartmentId") REFERENCES "sub_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
