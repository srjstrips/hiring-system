-- Fix application delete: add ON DELETE CASCADE to all child tables
-- so that deleting an Application removes its interviews, offers,
-- assessment assignments/attempts, and employee record automatically.

-- interviews
ALTER TABLE "interviews"
  DROP CONSTRAINT "interviews_applicationId_fkey",
  ADD CONSTRAINT "interviews_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- offers
ALTER TABLE "offers"
  DROP CONSTRAINT "offers_applicationId_fkey",
  ADD CONSTRAINT "offers_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- employees
ALTER TABLE "employees"
  DROP CONSTRAINT "employees_applicationId_fkey",
  ADD CONSTRAINT "employees_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- assessment_assignments
ALTER TABLE "assessment_assignments"
  DROP CONSTRAINT "assessment_assignments_applicationId_fkey",
  ADD CONSTRAINT "assessment_assignments_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- assessment_attempts
ALTER TABLE "assessment_attempts"
  DROP CONSTRAINT "assessment_attempts_applicationId_fkey",
  ADD CONSTRAINT "assessment_attempts_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
