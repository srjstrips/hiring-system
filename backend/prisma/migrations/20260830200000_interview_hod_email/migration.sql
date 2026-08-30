-- Add HOD email and name fields to interviews for no-login join link
ALTER TABLE "interviews"
  ADD COLUMN IF NOT EXISTS "hodEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "hodName"  TEXT;
