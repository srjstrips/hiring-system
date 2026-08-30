-- Make Assessment.jobId optional so TalentSignal can be a global assessment
-- not tied to any specific job opening.

ALTER TABLE "assessments" ALTER COLUMN "jobId" DROP NOT NULL;

-- Fix Personality Assessment Invitation template to use correct placeholder names.
-- Our email variable resolver uses snake_case keys matching buildApplicationEmailVars().
UPDATE "email_templates"
SET
  subject = 'Action required: Complete your Personality Assessment — {{job_title}}',
  body    = '<p>Dear {{candidate_name}},</p>
<p>As the next step in your application for <strong>{{job_title}}</strong> at <strong>{{company_name}}</strong>, you have been invited to complete a <strong>Personality Assessment</strong>.</p>
<p><strong>Assessment Details:</strong></p>
<ul>
  <li>Assessment: {{assessment_name}}</li>
  <li>Duration: approximately {{assessment_duration}} minutes</li>
  <li>This link is valid for <strong>24 hours</strong> — please complete it promptly.</li>
</ul>
<div style="margin:24px 0;">
  <a href="{{assessment_link}}" style="background:#d97706;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Begin Assessment</a>
</div>
<p>This link is personal to you. Do not share it. If you face any issues, reply to this email.</p>
<p>Best regards,<br>{{hr_name}}<br>{{company_name}} Talent Acquisition</p>'
WHERE name = 'Personality Assessment Invitation';

-- The category must match the pipeline stage key for auto-send to work.
-- Previously seeded as 'ASSESSMENT' but findActiveByStage() matches on the exact stage key.
UPDATE "email_templates"
SET category = 'PERSONALITY_ASSESSMENT'
WHERE name = 'Personality Assessment Invitation';
