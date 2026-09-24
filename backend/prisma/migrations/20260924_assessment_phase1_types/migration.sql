-- Assessment Phase 1: Multiple Assessment Types with Flexible Scoring
-- Adds support for TECHNICAL, PERSONALITY, APTITUDE, DEPARTMENT, GENERAL, SITUATIONAL
-- Implements trait-based scoring for personality assessments

-- 1. Extend QuestionType enum to include 1-5 rating scale
DO $$ BEGIN
  ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'RATING_SCALE_5';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create AssessmentType enum
DO $$ BEGIN
  CREATE TYPE "AssessmentType" AS ENUM (
    'TECHNICAL',
    'PERSONALITY',
    'APTITUDE',
    'DEPARTMENT',
    'GENERAL',
    'SITUATIONAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Create PersonalityTrait enum
DO $$ BEGIN
  CREATE TYPE "PersonalityTrait" AS ENUM (
    'LEADERSHIP',
    'LEARNING_ADAPTABILITY',
    'TEAMWORK',
    'COMMUNICATION',
    'RESPONSIBILITY',
    'PROBLEM_SOLVING',
    'WORK_DISCIPLINE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Extend assessments table with new fields
ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "assessmentType" "AssessmentType" NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS "departmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "instructions" TEXT,
  ADD COLUMN IF NOT EXISTS "maxQuestions" INTEGER;

-- 5. Add foreign key for department
DO $$ BEGIN
  ALTER TABLE "assessments"
    ADD CONSTRAINT "assessments_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Add index on assessmentType
CREATE INDEX IF NOT EXISTS "assessments_assessmentType_idx" ON "assessments"("assessmentType");
CREATE INDEX IF NOT EXISTS "assessments_departmentId_idx" ON "assessments"("departmentId");

-- 8. Extend assessment_questions table with category field
ALTER TABLE "assessment_questions"
  ADD COLUMN IF NOT EXISTS "category" TEXT;

CREATE INDEX IF NOT EXISTS "assessment_questions_trait_idx" ON "assessment_questions"("trait");

-- 9. Create assessment_traits table
CREATE TABLE IF NOT EXISTS "assessment_traits" (
  "id"           TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "traitName"    "PersonalityTrait" NOT NULL,
  "description"  TEXT,
  "minScore"     INTEGER NOT NULL DEFAULT 1,
  "maxScore"     INTEGER NOT NULL DEFAULT 5,
  "level1Label"  TEXT NOT NULL DEFAULT 'Very Low',
  "level2Label"  TEXT NOT NULL DEFAULT 'Low',
  "level3Label"  TEXT NOT NULL DEFAULT 'Moderate',
  "level4Label"  TEXT NOT NULL DEFAULT 'High',
  "level5Label"  TEXT NOT NULL DEFAULT 'Very High',
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "assessment_traits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessment_traits_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE,
  UNIQUE ("assessmentId", "traitName")
);

CREATE INDEX "assessment_traits_assessmentId_idx" ON "assessment_traits"("assessmentId");

-- 10. Create assessment_trait_scores table
CREATE TABLE IF NOT EXISTS "assessment_trait_scores" (
  "id"            TEXT NOT NULL,
  "attemptId"     TEXT NOT NULL,
  "candidateId"   TEXT NOT NULL,
  "assessmentId"  TEXT NOT NULL,
  "traitName"     TEXT NOT NULL,
  "totalScore"    INTEGER NOT NULL,
  "questionCount" INTEGER NOT NULL,
  "averageScore"  DOUBLE PRECISION NOT NULL,
  "level"         INTEGER NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "assessment_trait_scores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessment_trait_scores_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE,
  UNIQUE ("attemptId", "traitName")
);

CREATE INDEX "assessment_trait_scores_attemptId_idx" ON "assessment_trait_scores"("attemptId");
CREATE INDEX "assessment_trait_scores_candidateId_idx" ON "assessment_trait_scores"("candidateId");
CREATE INDEX "assessment_trait_scores_assessmentId_idx" ON "assessment_trait_scores"("assessmentId");
