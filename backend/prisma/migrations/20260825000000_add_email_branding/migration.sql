CREATE TABLE "email_branding" (
  "id"           TEXT NOT NULL,
  "companyName"  TEXT NOT NULL DEFAULT 'SRJ Group',
  "logoUrl"      TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#b45309',
  "footerText"   TEXT,
  "websiteUrl"   TEXT,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_branding_pkey" PRIMARY KEY ("id")
);

-- Seed one default row so the service always has a config to read
INSERT INTO "email_branding" ("id","companyName","primaryColor","updatedAt")
VALUES ('default-branding','SRJ Group','#b45309',now());
