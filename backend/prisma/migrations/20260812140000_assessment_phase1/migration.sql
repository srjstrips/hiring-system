-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'STARTED', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- Extend QuestionType for future phases
DO $$ BEGIN ALTER TYPE "QuestionType" ADD VALUE 'MULTIPLE_SELECT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "QuestionType" ADD VALUE 'SHORT_ANSWER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "QuestionType" ADD VALUE 'CODING'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "QuestionType" ADD VALUE 'DESCRIPTIVE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rename assessment_templates -> assessments
ALTER TABLE "assessment_templates" RENAME TO "assessments";
ALTER TABLE "assessments" RENAME COLUMN "title" TO "name";

-- Drop 1:1 unique on jobId
DROP INDEX IF EXISTS "assessment_templates_jobId_key";
CREATE INDEX "assessments_jobId_idx" ON "assessments"("jobId");

-- New assessment columns (status before its index)
ALTER TABLE "assessments" ADD COLUMN "designationId" TEXT;
ALTER TABLE "assessments" ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "assessments" ADD COLUMN "startAt" TIMESTAMP(3);
ALTER TABLE "assessments" ADD COLUMN "endAt" TIMESTAMP(3);
ALTER TABLE "assessments" ADD COLUMN "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "assessments" ADD COLUMN "createdById" TEXT;
ALTER TABLE "assessments" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "assessments_status_idx" ON "assessments"("status");

-- Backfill designation + createdBy from job
UPDATE "assessments" a
SET "designationId" = j."designationId",
    "createdById" = COALESCE(a."createdById", j."createdById")
FROM "jobs" j
WHERE a."jobId" = j."id";

UPDATE "assessments"
SET "createdById" = (SELECT "id" FROM "users" WHERE "deletedAt" IS NULL LIMIT 1)
WHERE "createdById" IS NULL;

ALTER TABLE "assessments" ALTER COLUMN "createdById" SET NOT NULL;

UPDATE "assessments"
SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"AssessmentStatus" ELSE 'DRAFT'::"AssessmentStatus" END;

ALTER TABLE "assessments" DROP COLUMN "isActive";

-- Rename question/attempt FK columns
ALTER TABLE "assessment_questions" RENAME COLUMN "templateId" TO "assessmentId";
ALTER TABLE "assessment_questions" RENAME COLUMN "orderIndex" TO "displayOrder";
ALTER TABLE "assessment_questions" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "assessment_questions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "assessment_questions_assessmentId_idx" ON "assessment_questions"("assessmentId");

ALTER TABLE "assessment_attempts" RENAME COLUMN "templateId" TO "assessmentId";

-- Recreate FKs for renamed tables/columns
ALTER TABLE "assessments" DROP CONSTRAINT IF EXISTS "assessment_templates_jobId_fkey";
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assessment_questions" DROP CONSTRAINT IF EXISTS "assessment_questions_templateId_fkey";
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessment_attempts" DROP CONSTRAINT IF EXISTS "assessment_attempts_templateId_fkey";
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Options table
CREATE TABLE "assessment_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "assessment_options_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assessment_options_questionId_idx" ON "assessment_options"("questionId");
ALTER TABLE "assessment_options" ADD CONSTRAINT "assessment_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "assessment_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Migrate JSON options into rows (best-effort)
INSERT INTO "assessment_options" ("id", "questionId", "optionText", "isCorrect", "displayOrder")
SELECT
  gen_random_uuid()::text,
  q."id",
  opt.option_text,
  CASE
    WHEN q."correctAnswer" IS NOT NULL AND LOWER(TRIM(q."correctAnswer")) = LOWER(TRIM(opt.option_text)) THEN true
    ELSE false
  END,
  (opt.ord - 1)::integer
FROM "assessment_questions" q
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(q."options"::jsonb, '[]'::jsonb)) WITH ORDINALITY AS opt(option_text, ord)
WHERE jsonb_typeof(COALESCE(q."options"::jsonb, '[]'::jsonb)) = 'array';

-- Assignments table
CREATE TABLE "assessment_assignments" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "secureToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assessment_assignments_secureToken_key" ON "assessment_assignments"("secureToken");
CREATE UNIQUE INDEX "assessment_assignments_assessmentId_applicationId_key" ON "assessment_assignments"("assessmentId", "applicationId");
CREATE INDEX "assessment_assignments_assessmentId_idx" ON "assessment_assignments"("assessmentId");
CREATE INDEX "assessment_assignments_candidateId_idx" ON "assessment_assignments"("candidateId");
CREATE INDEX "assessment_assignments_secureToken_idx" ON "assessment_assignments"("secureToken");

ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_assignments" ADD CONSTRAINT "assessment_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
