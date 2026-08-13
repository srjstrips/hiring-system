-- Assessment recording metadata (non-destructive additive migration)

ALTER TABLE "assessment_attempts" ADD COLUMN IF NOT EXISTS "recordingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "assessment_attempts" ADD COLUMN IF NOT EXISTS "recordingConsentAt" TIMESTAMP(3);

DO $$ BEGIN
  CREATE TYPE "RecordingType" AS ENUM ('CAMERA', 'SCREEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RecordingStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'DELETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "assessment_recordings" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "candidateId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "recordingType" "RecordingType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "durationSeconds" INTEGER,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordingStatus" NOT NULL DEFAULT 'UPLOADING',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_recordings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "assessment_recording_chunks" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_recording_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "assessment_recording_events" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "recordingId" TEXT,
    "eventType" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_recording_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "assessment_recordings_attemptId_recordingType_key" ON "assessment_recordings"("attemptId", "recordingType");
CREATE INDEX IF NOT EXISTS "assessment_recordings_attemptId_idx" ON "assessment_recordings"("attemptId");
CREATE INDEX IF NOT EXISTS "assessment_recordings_assignmentId_idx" ON "assessment_recordings"("assignmentId");
CREATE INDEX IF NOT EXISTS "assessment_recordings_candidateId_idx" ON "assessment_recordings"("candidateId");
CREATE INDEX IF NOT EXISTS "assessment_recordings_status_idx" ON "assessment_recordings"("status");
CREATE INDEX IF NOT EXISTS "assessment_recordings_expiresAt_idx" ON "assessment_recordings"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_recording_chunks_recordingId_chunkIndex_key" ON "assessment_recording_chunks"("recordingId", "chunkIndex");
CREATE INDEX IF NOT EXISTS "assessment_recording_chunks_recordingId_idx" ON "assessment_recording_chunks"("recordingId");
CREATE INDEX IF NOT EXISTS "assessment_recording_events_attemptId_idx" ON "assessment_recording_events"("attemptId");
CREATE INDEX IF NOT EXISTS "assessment_recording_events_recordingId_idx" ON "assessment_recording_events"("recordingId");

DO $$ BEGIN
  ALTER TABLE "assessment_recordings" ADD CONSTRAINT "assessment_recordings_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "assessment_recording_chunks" ADD CONSTRAINT "assessment_recording_chunks_recordingId_fkey"
    FOREIGN KEY ("recordingId") REFERENCES "assessment_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "assessment_recording_events" ADD CONSTRAINT "assessment_recording_events_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "assessment_recording_events" ADD CONSTRAINT "assessment_recording_events_recordingId_fkey"
    FOREIGN KEY ("recordingId") REFERENCES "assessment_recordings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
