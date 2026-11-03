-- Add availableFrom column to assessment_assignments
-- Uses IF NOT EXISTS so it is safe to run on a DB that already has the column
-- (added manually on production before this migration was created).
ALTER TABLE "assessment_assignments"
  ADD COLUMN IF NOT EXISTS "availableFrom" TIMESTAMP(3);
