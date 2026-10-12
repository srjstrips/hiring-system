CREATE TABLE "candidate_password_resets" (
  "id"          TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "token"       TEXT NOT NULL,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "usedAt"      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "candidate_password_resets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "candidate_password_resets_token_key" UNIQUE ("token"),
  CONSTRAINT "candidate_password_resets_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
