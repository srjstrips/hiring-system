-- TalentSignal™ Personality Assessment Extension
-- Adds: FORCED_CHOICE question type, assessmentMode, SJT scoring fields,
--       personality result table (trait T-scores, composites, flags, archetype, fit scores)

-- 1. Extend QuestionType enum
DO $$ BEGIN
  ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'FORCED_CHOICE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend SJT scoring fields on assessment_questions
--    trait: H|ES|X|A|C|O (for FORCED_CHOICE statements)
--    sjtPart: B1|B2|B3 (for SJT questions)
--    sjtKey: JSON array [{optionIndex, score}] for SJT answer keys
--    validityScale: IM|INF|CONS (for Likert validity items)
--    isReversed: for reversed Likert items

ALTER TABLE "assessment_questions"
  ADD COLUMN IF NOT EXISTS "trait"         TEXT,
  ADD COLUMN IF NOT EXISTS "sjtPart"       TEXT,
  ADD COLUMN IF NOT EXISTS "sjtKey"        JSONB,
  ADD COLUMN IF NOT EXISTS "validityScale" TEXT,
  ADD COLUMN IF NOT EXISTS "isReversed"    BOOLEAN NOT NULL DEFAULT false;

-- 3. Assessment mode column
DO $$ BEGIN
  CREATE TYPE "AssessmentMode" AS ENUM ('KNOWLEDGE', 'PERSONALITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "mode" "AssessmentMode" NOT NULL DEFAULT 'KNOWLEDGE';

-- 4. Personality result table (one per submitted attempt)
CREATE TABLE IF NOT EXISTS "assessment_personality_results" (
  "id"              TEXT NOT NULL,
  "attemptId"       TEXT NOT NULL,
  "assessmentId"    TEXT NOT NULL,
  "candidateId"     TEXT NOT NULL,
  "applicationId"   TEXT NOT NULL,

  -- HEXACO T-scores (mean 50, SD 10)
  "tH"   DOUBLE PRECISION,
  "tES"  DOUBLE PRECISION,
  "tX"   DOUBLE PRECISION,
  "tA"   DOUBLE PRECISION,
  "tC"   DOUBLE PRECISION,
  "tO"   DOUBLE PRECISION,

  -- SJT sub-scores (T)
  "sjtWork"       DOUBLE PRECISION,
  "sjtSafety"     DOUBLE PRECISION,
  "sjtLeadership" DOUBLE PRECISION,

  -- Likert content scales (T)
  "tRES" DOUBLE PRECISION,
  "tADA" DOUBLE PRECISION,
  "tACH" DOUBLE PRECISION,

  -- GMA (T, nullable — Part D optional)
  "tGMA" DOUBLE PRECISION,

  -- Validity indices (raw)
  "imScore"      INTEGER,
  "imFlagged"    BOOLEAN NOT NULL DEFAULT false,
  "infFlagged"   BOOLEAN NOT NULL DEFAULT false,
  "consFlagged"  BOOLEAN NOT NULL DEFAULT false,
  "confidenceScore" INTEGER NOT NULL DEFAULT 100,

  -- Composite scores (0-100)
  "compLeadership"    DOUBLE PRECISION,
  "compDecisionStyle" TEXT,          -- Analytical|Directive|Innovative|Deliberative
  "compLearningAgility" DOUBLE PRECISION,
  "compAccountability"  DOUBLE PRECISION,
  "compIntegrity"       DOUBLE PRECISION,
  "compTeamCompatibility" DOUBLE PRECISION,
  "compCommStyle"       TEXT,          -- Expressive|Diplomatic|Direct|Reserved-precise
  "compEmotionalResilience" DOUBLE PRECISION,
  "compAdaptability"    DOUBLE PRECISION,
  "compRiskAppetite"    DOUBLE PRECISION,
  "compConflictStyle"   TEXT,          -- Collaborator|Accommodator|Competitor|Avoider
  "compStressBand"      TEXT,          -- Low|Moderate|High resilience

  -- Derailer flags (JSON array of flag names)
  "derailerFlags"  JSONB NOT NULL DEFAULT '[]',

  -- Archetype
  "archetype"     TEXT,               -- The Anchor, The Guardian, etc.

  -- Role-fit scores (JSON: {roleFamily: score})
  "roleFitScores" JSONB NOT NULL DEFAULT '{}',

  -- Top recommendation
  "fitBand"       TEXT,               -- Strong Fit|Fit|Conditional|Low Fit

  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "assessment_personality_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "apr_attempt_unique"
  ON "assessment_personality_results"("attemptId");

CREATE INDEX IF NOT EXISTS "apr_candidate_idx"
  ON "assessment_personality_results"("candidateId");

CREATE INDEX IF NOT EXISTS "apr_assessment_idx"
  ON "assessment_personality_results"("assessmentId");

ALTER TABLE "assessment_personality_results"
  ADD CONSTRAINT "apr_attempt_fk"
  FOREIGN KEY ("attemptId") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE;

-- 5. Extend snapshot table with trait/sjtPart so scoring can use snapshots
ALTER TABLE "assessment_attempt_questions"
  ADD COLUMN IF NOT EXISTS "trait"         TEXT,
  ADD COLUMN IF NOT EXISTS "sjtPart"       TEXT,
  ADD COLUMN IF NOT EXISTS "sjtKey"        JSONB,
  ADD COLUMN IF NOT EXISTS "validityScale" TEXT,
  ADD COLUMN IF NOT EXISTS "isReversed"    BOOLEAN NOT NULL DEFAULT false;

-- 6. Track forced-choice Most/Least selections separately
--    selectedMostId / selectedLeastId reference attempt_options
ALTER TABLE "assessment_answers"
  ADD COLUMN IF NOT EXISTS "selectedMostId"  TEXT,
  ADD COLUMN IF NOT EXISTS "selectedLeastId" TEXT,
  ADD COLUMN IF NOT EXISTS "sjtScore"        INTEGER;   -- scored SJT value (+2/+1/0/-1)
