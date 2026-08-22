-- AlterTable
ALTER TABLE "candidates"
    ADD COLUMN "jobAlertSubscribed" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "jobAlertWeeklySentAt" TIMESTAMP(3),
    ADD COLUMN "jobAlertMonthlySentAt" TIMESTAMP(3);
