-- Create pipeline_stages table
CREATE TABLE "pipeline_stages" (
  "key"        TEXT NOT NULL,
  "label"      TEXT NOT NULL,
  "color"      TEXT NOT NULL DEFAULT '#6b7280',
  "type"       TEXT NOT NULL DEFAULT 'CUSTOM',
  "stageOrder" INTEGER NOT NULL,
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "isFixed"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("key")
);

-- Seed default pipeline stages
INSERT INTO "pipeline_stages" ("key","label","color","type","stageOrder","isFixed") VALUES
  ('APPLIED',           'Applied',           '#3b82f6', 'FIXED',     1,  true),
  ('SCREENING',         'Screening',         '#8b5cf6', 'TEST',      2,  false),
  ('SHORTLISTED',       'Shortlisted',       '#06b6d4', 'FIXED',     3,  false),
  ('INTERVIEW_ROUND_1', 'Interview Round 1', '#f59e0b', 'INTERVIEW', 4,  false),
  ('INTERVIEW_ROUND_2', 'Interview Round 2', '#f97316', 'INTERVIEW', 5,  false),
  ('HR_ROUND',          'HR Round',          '#ef4444', 'INTERVIEW', 6,  false),
  ('SELECTED',          'Selected',          '#10b981', 'FIXED',     7,  true),
  ('OFFER_SENT',        'Offer Sent',        '#14b8a6', 'FIXED',     8,  true),
  ('OFFER_ACCEPTED',    'Offer Accepted',    '#22c55e', 'FIXED',     9,  true),
  ('JOINED',            'Joined',            '#16a34a', 'FIXED',     10, true),
  ('REJECTED',          'Rejected',          '#ef4444', 'FIXED',     99, true),
  ('WITHDRAWN',         'Withdrawn',         '#6b7280', 'FIXED',     98, true),
  ('ON_HOLD',           'On Hold',           '#f59e0b', 'FIXED',     97, true);

-- Change Application.status from enum to String
ALTER TABLE "applications" ALTER COLUMN "status" TYPE TEXT;
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'APPLIED';

-- Change ApplicationTimeline status columns from enum to String
ALTER TABLE "application_timeline" ALTER COLUMN "fromStatus" TYPE TEXT;
ALTER TABLE "application_timeline" ALTER COLUMN "toStatus" TYPE TEXT;

-- Drop the old enum (now unused)
DROP TYPE IF EXISTS "CandidateStatus";
