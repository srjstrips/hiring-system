-- Allow multiple attempts per application (maxAttempts > 1)
DROP INDEX IF EXISTS "assessment_attempts_applicationId_key";
CREATE INDEX IF NOT EXISTS "assessment_attempts_applicationId_idx" ON "assessment_attempts"("applicationId");

ALTER TABLE "assessment_attempts" ADD COLUMN IF NOT EXISTS "assignmentId" TEXT;
ALTER TABLE "assessment_attempts" ADD COLUMN IF NOT EXISTS "attemptNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "assessment_attempts" ADD COLUMN IF NOT EXISTS "obtainedMarks" INTEGER;

CREATE INDEX IF NOT EXISTS "assessment_attempts_assignmentId_idx" ON "assessment_attempts"("assignmentId");

-- Unique attempt number per assignment (partial: only when assignmentId set)
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_attempts_assignmentId_attemptNumber_key"
  ON "assessment_attempts"("assignmentId", "attemptNumber")
  WHERE "assignmentId" IS NOT NULL;

ALTER TABLE "assessment_attempts"
  ADD CONSTRAINT "assessment_attempts_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "assessment_assignments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Snapshot tables for historical integrity
CREATE TABLE "assessment_attempt_questions" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "originalQuestionId" TEXT,
    "questionText" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL DEFAULT 'MCQ',
    "marks" INTEGER NOT NULL DEFAULT 1,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_attempt_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assessment_attempt_questions_attemptId_idx" ON "assessment_attempt_questions"("attemptId");
ALTER TABLE "assessment_attempt_questions"
  ADD CONSTRAINT "assessment_attempt_questions_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "assessment_attempt_options" (
    "id" TEXT NOT NULL,
    "attemptQuestionId" TEXT NOT NULL,
    "originalOptionId" TEXT,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "assessment_attempt_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assessment_attempt_options_attemptQuestionId_idx" ON "assessment_attempt_options"("attemptQuestionId");
ALTER TABLE "assessment_attempt_options"
  ADD CONSTRAINT "assessment_attempt_options_attemptQuestionId_fkey"
  FOREIGN KEY ("attemptQuestionId") REFERENCES "assessment_attempt_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Extend answers for option selection + snapshots
ALTER TABLE "assessment_answers" ADD COLUMN IF NOT EXISTS "attemptQuestionId" TEXT;
ALTER TABLE "assessment_answers" ADD COLUMN IF NOT EXISTS "selectedOptionId" TEXT;
ALTER TABLE "assessment_answers" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "assessment_answers" ALTER COLUMN "questionId" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "assessment_answers_attemptId_attemptQuestionId_key"
  ON "assessment_answers"("attemptId", "attemptQuestionId")
  WHERE "attemptQuestionId" IS NOT NULL;

ALTER TABLE "assessment_answers"
  ADD CONSTRAINT "assessment_answers_attemptQuestionId_fkey"
  FOREIGN KEY ("attemptQuestionId") REFERENCES "assessment_attempt_questions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "assessment_answers"
  ADD CONSTRAINT "assessment_answers_selectedOptionId_fkey"
  FOREIGN KEY ("selectedOptionId") REFERENCES "assessment_attempt_options"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
