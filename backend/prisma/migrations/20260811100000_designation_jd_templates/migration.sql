-- AlterTable
ALTER TABLE "designations" ADD COLUMN IF NOT EXISTS "defaultDescription" TEXT;
ALTER TABLE "designations" ADD COLUMN IF NOT EXISTS "defaultResponsibilities" TEXT;
ALTER TABLE "designations" ADD COLUMN IF NOT EXISTS "defaultRequirements" TEXT;
ALTER TABLE "designations" ADD COLUMN IF NOT EXISTS "defaultBenefits" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "designation_skills" (
    "id" TEXT NOT NULL,
    "designationId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "designation_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "designation_skills_designationId_skillId_key" ON "designation_skills"("designationId", "skillId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "designation_skills" ADD CONSTRAINT "designation_skills_designationId_fkey"
    FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "designation_skills" ADD CONSTRAINT "designation_skills_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
