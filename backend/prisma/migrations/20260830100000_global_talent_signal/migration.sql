-- Make Assessment.jobId optional so TalentSignal can be a global assessment
-- not tied to any specific job opening.

ALTER TABLE "assessments" ALTER COLUMN "jobId" DROP NOT NULL;
