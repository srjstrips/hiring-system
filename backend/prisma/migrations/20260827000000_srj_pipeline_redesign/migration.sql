-- ─── SRJ GROUP PIPELINE REDESIGN ─────────────────────────────────────────────
-- Replaces the old default stages with the full SRJ hiring pipeline.
-- Side-exit stages get stageOrder 90-99 so they always sort after real stages.

-- Clear existing non-fixed / re-seed everything cleanly
DELETE FROM "pipeline_stages";

INSERT INTO "pipeline_stages" ("key","label","color","type","stageOrder","isFixed","isActive") VALUES
  -- ── Main pipeline ──────────────────────────────────────────────────────────
  ('APPLIED',                 'Application Received',      '#3b82f6', 'FIXED',     1,  true,  true),
  ('SCREENING',               'Screening',                 '#8b5cf6', 'CUSTOM',    2,  false, true),
  ('PERSONALITY_ASSESSMENT',  'Personality Assessment',    '#f59e0b', 'TEST',      3,  false, true),
  ('DEPT_WORKING_TEST',       'Department Working Test',   '#f97316', 'TEST',      4,  false, true),
  ('HOD_HR_INTERVIEW',        'HOD + HR Interview',        '#06b6d4', 'INTERVIEW', 5,  false, true),
  ('DIRECTOR_INTERVIEW',      'Director Interview',        '#6366f1', 'INTERVIEW', 6,  false, true),
  ('SHORTLISTED',             'Shortlisted',               '#10b981', 'CUSTOM',    7,  false, true),
  ('DOCUMENT_VERIFICATION',   'Document Verification',     '#14b8a6', 'CUSTOM',    8,  false, true),
  ('OFFER_LETTER',            'Offer Letter',              '#22c55e', 'FIXED',     9,  true,  true),
  ('OFFER_ACCEPTED',          'Offer Accepted',            '#16a34a', 'FIXED',     10, true,  true),
  ('VERIFICATION_COMPLETED',  'Verification Completed',    '#15803d', 'CUSTOM',    11, false, true),
  ('JOINING',                 'Joining',                   '#166534', 'FIXED',     12, true,  true),
  -- ── Side-exit / parallel outcomes ─────────────────────────────────────────
  ('ON_HOLD',                 'On Hold',                   '#f59e0b', 'FIXED',     90, true,  true),
  ('WITHDRAWN',               'Withdrawn',                 '#6b7280', 'FIXED',     91, true,  true),
  ('REJECTED',                'Rejected',                  '#ef4444', 'FIXED',     92, true,  true),
  ('OFFER_DECLINED',          'Offer Declined',            '#f87171', 'FIXED',     93, true,  true),
  ('VERIFICATION_FAILED',     'Verification Failed',       '#dc2626', 'FIXED',     94, true,  true),
  ('DID_NOT_JOIN',            'Did Not Join',              '#b91c1c', 'FIXED',     95, true,  true),
  ('POSITION_CLOSED',         'Position Closed',           '#78716c', 'FIXED',     96, true,  true),
  ('CANDIDATE_UNRESPONSIVE',  'Candidate Unresponsive',    '#a8a29e', 'FIXED',     97, true,  true);

-- ── Email templates for all 30 trigger events ────────────────────────────────
-- Using INSERT ... ON CONFLICT DO NOTHING so re-runs are safe.

INSERT INTO "email_templates" ("id","name","subject","body","category","description","isActive","createdAt","updatedAt") VALUES

-- 1. Application submitted → Candidate
(gen_random_uuid(),
 'Application Successfully Received',
 'We received your application — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>Thank you for applying for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>. We have successfully received your application.</p>
<p>Our team will review your profile and get back to you shortly. You can expect to hear from us within 5–7 business days.</p>
<p>We appreciate your interest and wish you the best!</p>
<p>Warm regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'APPLICATION', 'Sent automatically when a candidate submits an application', true, NOW(), NOW()),

-- 2. Application submitted → HR notification
(gen_random_uuid(),
 'New Application Notification (HR)',
 'New Application: {{candidateName}} for {{jobTitle}}',
 '<p>Hi Team,</p>
<p>A new application has been received:</p>
<ul>
  <li><strong>Candidate:</strong> {{candidateName}}</li>
  <li><strong>Position:</strong> {{jobTitle}}</li>
  <li><strong>Department:</strong> {{departmentName}}</li>
  <li><strong>Applied On:</strong> {{appliedDate}}</li>
</ul>
<p>Please review the application in the ATS.</p>',
 'APPLICATION', 'HR notification when a new application is submitted', true, NOW(), NOW()),

-- 3. Screening passed → Candidate
(gen_random_uuid(),
 'Screening Passed',
 'Good news — you have cleared the initial screening!',
 '<p>Dear {{candidateName}},</p>
<p>Congratulations! You have successfully cleared the initial screening for the <strong>{{jobTitle}}</strong> role at <strong>{{companyName}}</strong>.</p>
<p>We will be in touch shortly with the next steps in the process.</p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'SCREENING', 'Sent when candidate passes screening stage', true, NOW(), NOW()),

-- 4. Screening failed → Candidate
(gen_random_uuid(),
 'Application Update — Screening',
 'Update on your application for {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>Thank you for your interest in the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>.</p>
<p>After careful consideration, we regret to inform you that your profile does not match our requirements at this time.</p>
<p>We encourage you to apply for future openings that match your profile. We wish you the very best in your career journey.</p>
<p>Regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'SCREENING', 'Sent when candidate does not pass screening', true, NOW(), NOW()),

-- 5. Assessment assigned → Candidate
(gen_random_uuid(),
 'Personality Assessment Invitation',
 'You are invited to complete a Personality Assessment — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>As the next step in your application for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>, we invite you to complete a <strong>Personality Assessment</strong>.</p>
<p><strong>Assessment Details:</strong></p>
<ul>
  <li>Duration: {{durationMins}} minutes</li>
  <li>Valid until: {{endDate}}</li>
</ul>
<p><a href="{{assessmentLink}}" style="background:#FF6B00;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Start Assessment</a></p>
<p>Please complete this at the earliest. If you face any issues, reply to this email.</p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'ASSESSMENT', 'Sent when personality assessment is assigned to candidate', true, NOW(), NOW()),

-- 6. Assessment reminder → Candidate
(gen_random_uuid(),
 'Assessment Reminder',
 'Reminder: Complete your Personality Assessment for {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>This is a friendly reminder to complete your <strong>Personality Assessment</strong> for the <strong>{{jobTitle}}</strong> role at <strong>{{companyName}}</strong>.</p>
<p>Please complete it before <strong>{{endDate}}</strong>.</p>
<p><a href="{{assessmentLink}}" style="background:#FF6B00;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Complete Assessment</a></p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'ASSESSMENT', 'Reminder sent for pending personality assessment', true, NOW(), NOW()),

-- 7. Assessment completed → Candidate
(gen_random_uuid(),
 'Assessment Submitted',
 'Your Personality Assessment has been received',
 '<p>Dear {{candidateName}},</p>
<p>Thank you for completing the Personality Assessment for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>. We have received your submission.</p>
<p>Our team will review the results and update you on your application status shortly.</p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'ASSESSMENT', 'Sent when candidate submits personality assessment', true, NOW(), NOW()),

-- 8. Department working test assigned → Candidate
(gen_random_uuid(),
 'Working Test Invitation',
 'Invitation: Department Working Test for {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>Congratulations on progressing to the next stage! You are invited to complete a <strong>Department Working Test</strong> for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>.</p>
<p><strong>Test Details:</strong></p>
<ul>
  <li>Duration: {{durationMins}} minutes</li>
  <li>Valid until: {{endDate}}</li>
</ul>
<p><a href="{{assessmentLink}}" style="background:#FF6B00;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Start Test</a></p>
<p>Best of luck!</p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'ASSESSMENT', 'Sent when department working test is assigned', true, NOW(), NOW()),

-- 9. Department working test reminder → Candidate
(gen_random_uuid(),
 'Working Test Reminder',
 'Reminder: Complete your Department Working Test for {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>This is a reminder that your <strong>Department Working Test</strong> for <strong>{{jobTitle}}</strong> is still pending. Please complete it before <strong>{{endDate}}</strong>.</p>
<p><a href="{{assessmentLink}}" style="background:#FF6B00;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">Complete Test</a></p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'ASSESSMENT', 'Reminder for pending department working test', true, NOW(), NOW()),

-- 10. Working test passed → Candidate
(gen_random_uuid(),
 'Working Test Result — Passed',
 'Great news — you have cleared the Department Working Test!',
 '<p>Dear {{candidateName}},</p>
<p>We are pleased to inform you that you have <strong>successfully cleared</strong> the Department Working Test for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>
<p>We will be in touch with the next steps very soon.</p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'ASSESSMENT', 'Sent when candidate passes the department working test', true, NOW(), NOW()),

-- 11. Working test failed → Candidate
(gen_random_uuid(),
 'Application Update — Working Test',
 'Update on your application for {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>Thank you for completing the Department Working Test for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>
<p>After reviewing your results, we regret to inform you that we will not be moving forward with your application at this time. We appreciate the effort you put in and encourage you to apply for future opportunities.</p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'ASSESSMENT', 'Sent when candidate does not pass the department working test', true, NOW(), NOW()),

-- 12. HOD+HR interview scheduled → Candidate
(gen_random_uuid(),
 'Interview Invitation — HOD & HR Round',
 'Interview Scheduled: {{jobTitle}} at {{companyName}}',
 '<p>Dear {{candidateName}},</p>
<p>We are pleased to invite you for the <strong>HOD & HR Interview</strong> for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>.</p>
<p><strong>Interview Details:</strong></p>
<ul>
  <li>Date & Time: {{interviewDate}}</li>
  <li>Mode: {{interviewMode}}</li>
  <li>Duration: {{durationMinutes}} minutes</li>
  {{#if meetingLink}}<li>Meeting Link: <a href="{{meetingLink}}">Join Here</a></li>{{/if}}
  {{#if location}}<li>Location: {{location}}</li>{{/if}}
</ul>
<p>Please confirm your availability by replying to this email.</p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'INTERVIEW', 'Sent when HOD + HR interview is scheduled', true, NOW(), NOW()),

-- 13. Interview reminder → Candidate
(gen_random_uuid(),
 'Interview Reminder',
 'Reminder: Your interview is tomorrow — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>This is a friendly reminder about your upcoming interview for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>
<p><strong>Interview Details:</strong></p>
<ul>
  <li>Date & Time: {{interviewDate}}</li>
  <li>Mode: {{interviewMode}}</li>
  {{#if meetingLink}}<li>Meeting Link: <a href="{{meetingLink}}">Join Here</a></li>{{/if}}
  {{#if location}}<li>Location: {{location}}</li>{{/if}}
</ul>
<p>Please be on time. We look forward to speaking with you!</p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'INTERVIEW', 'Reminder sent before an interview', true, NOW(), NOW()),

-- 14. HOD+HR interview completed → Candidate (optional)
(gen_random_uuid(),
 'Interview Completed — HOD & HR Round',
 'Thank you for attending the interview — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>Thank you for attending the HOD & HR Interview for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>. We appreciate the time you invested.</p>
<p>Our team is currently reviewing all candidates and will get back to you with an update soon.</p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'INTERVIEW', 'Optional follow-up after HOD+HR interview is completed', true, NOW(), NOW()),

-- 15. Director interview scheduled → Candidate
(gen_random_uuid(),
 'Director Interview Invitation',
 'Director Interview Scheduled: {{jobTitle}} at {{companyName}}',
 '<p>Dear {{candidateName}},</p>
<p>Congratulations on progressing to the final interview stage! You are invited for a <strong>Director Interview</strong> for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>.</p>
<p><strong>Interview Details:</strong></p>
<ul>
  <li>Date & Time: {{interviewDate}}</li>
  <li>Mode: {{interviewMode}}</li>
  <li>Duration: {{durationMinutes}} minutes</li>
  {{#if meetingLink}}<li>Meeting Link: <a href="{{meetingLink}}">Join Here</a></li>{{/if}}
  {{#if location}}<li>Location: {{location}}</li>{{/if}}
</ul>
<p>Please confirm your availability.</p>
<p>Best regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'INTERVIEW', 'Sent when director interview is scheduled', true, NOW(), NOW()),

-- 16. Selected / Shortlisted → Candidate
(gen_random_uuid(),
 'Selection Confirmation',
 'Congratulations! You have been shortlisted — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>We are delighted to inform you that you have been <strong>shortlisted</strong> for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>!</p>
<p>Our HR team will reach out to you shortly with further details on the next steps including document verification and offer formalities.</p>
<p>Congratulations and welcome aboard!</p>
<p>Warm regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'SELECTION', 'Sent when candidate is shortlisted/selected', true, NOW(), NOW()),

-- 17. Rejected → Candidate
(gen_random_uuid(),
 'Application Status Update — Rejected',
 'Update on your application for {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>Thank you for your interest in the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong> and for the time you invested in our selection process.</p>
<p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p>
<p>We will keep your profile in our database and may reach out if a suitable opportunity arises in the future. We wish you every success in your career.</p>
<p>Regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'OUTCOME', 'Sent when an application is rejected', true, NOW(), NOW()),

-- 18. On Hold → Candidate
(gen_random_uuid(),
 'Application On Hold',
 'Your application is currently on hold — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>Thank you for your patience. We wanted to update you that your application for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> is currently <strong>on hold</strong>.</p>
<p>This does not reflect negatively on your profile. We are in the process of finalising our hiring plan and will be in touch as soon as we have an update.</p>
<p>Thank you for your understanding.</p>
<p>Regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'OUTCOME', 'Sent when application is put on hold', true, NOW(), NOW()),

-- 19. Document verification requested → Candidate
(gen_random_uuid(),
 'Documents Required',
 'Action Required: Submit your documents for {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>Congratulations on your progress! As the next step for the <strong>{{jobTitle}}</strong> role at <strong>{{companyName}}</strong>, we need you to submit the following documents:</p>
<ul>
  <li>Aadhaar Card / PAN Card (ID Proof)</li>
  <li>Educational certificates (10th, 12th, Graduation)</li>
  <li>Previous employment offer letters / experience certificates</li>
  <li>Last 3 months payslips</li>
  <li>Passport-size photograph</li>
</ul>
<p>Please share the documents at the earliest so we can proceed without delays.</p>
<p>Regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'DOCUMENTS', 'Sent when document verification is initiated', true, NOW(), NOW()),

-- 20. Documents incomplete → Candidate
(gen_random_uuid(),
 'Documents Pending',
 'Reminder: Your documents are incomplete — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>We noticed that some documents required for your application for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> are still pending.</p>
<p>Please submit all required documents at the earliest to avoid any delays in processing your offer.</p>
<p>If you have any questions, feel free to reach out to us.</p>
<p>Regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'DOCUMENTS', 'Sent as reminder when documents are still pending', true, NOW(), NOW()),

-- 21. Documents verified → Candidate
(gen_random_uuid(),
 'Verification Completed',
 'Your documents have been verified — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>We are pleased to inform you that your documents have been successfully verified for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>.</p>
<p>We are now proceeding with the offer formalities. You will receive your offer letter shortly.</p>
<p>Regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'DOCUMENTS', 'Sent when candidate documents are fully verified', true, NOW(), NOW()),

-- 22. Offer generated → Candidate
(gen_random_uuid(),
 'Offer Letter',
 'Your Offer Letter — {{jobTitle}} at {{companyName}}',
 '<p>Dear {{candidateName}},</p>
<p>We are delighted to extend an offer for the position of <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>
<p>Please find your offer letter attached. Kindly review it and let us know your acceptance at the earliest.</p>
<p>We look forward to welcoming you to our team!</p>
<p>Warm regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'OFFER', 'Sent when offer letter is generated', true, NOW(), NOW()),

-- 23. Offer accepted → Candidate
(gen_random_uuid(),
 'Offer Acceptance Confirmation',
 'Welcome to {{companyName}}! Offer accepted — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>We are thrilled to confirm that you have accepted our offer for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>!</p>
<p>Our HR team will be in touch with your joining details shortly. Please keep an eye on your inbox.</p>
<p>We look forward to having you on board!</p>
<p>Warm regards,<br>{{companyName}} Talent Acquisition Team</p>',
 'OFFER', 'Sent when candidate accepts the offer', true, NOW(), NOW()),

-- 24. Offer declined → HR
(gen_random_uuid(),
 'Offer Declined Notification (HR)',
 'Offer Declined: {{candidateName}} — {{jobTitle}}',
 '<p>Hi Team,</p>
<p>This is to inform you that <strong>{{candidateName}}</strong> has <strong>declined the offer</strong> for the <strong>{{jobTitle}}</strong> position.</p>
<p>Please update the ATS and decide on the next steps (re-open position, consider next candidate, etc.).</p>
<p>Regards,<br>Hiring System</p>',
 'OFFER', 'HR notification when a candidate declines the offer', true, NOW(), NOW()),

-- 25. Joining scheduled → Candidate
(gen_random_uuid(),
 'Joining Confirmation',
 'Your Joining Details — {{jobTitle}} at {{companyName}}',
 '<p>Dear {{candidateName}},</p>
<p>We are excited to confirm your joining for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>.</p>
<p><strong>Joining Details:</strong></p>
<ul>
  <li>Date of Joining: {{joiningDate}}</li>
  <li>Reporting Time: 9:30 AM</li>
  <li>Reporting Location: {{location}}</li>
  <li>Report To: HR Department</li>
</ul>
<p>Please carry the following on your first day:</p>
<ul>
  <li>Original ID proof</li>
  <li>Passport-size photographs (2)</li>
  <li>All original educational certificates</li>
</ul>
<p>We look forward to seeing you!</p>
<p>Warm regards,<br>{{companyName}} HR Team</p>',
 'JOINING', 'Sent when joining date is confirmed', true, NOW(), NOW()),

-- 26. Joining reminder → Candidate
(gen_random_uuid(),
 'Joining Reminder',
 'Reminder: Your joining date is approaching — {{companyName}}',
 '<p>Dear {{candidateName}},</p>
<p>This is a friendly reminder that your joining date for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> is <strong>{{joiningDate}}</strong>.</p>
<p>Please ensure you have all required documents ready. We look forward to welcoming you!</p>
<p>Warm regards,<br>{{companyName}} HR Team</p>',
 'JOINING', 'Reminder sent before candidate joining date', true, NOW(), NOW()),

-- 27. Candidate joined → Candidate (Welcome)
(gen_random_uuid(),
 'Welcome / Joining Confirmation',
 'Welcome to {{companyName}}! 🎉',
 '<p>Dear {{candidateName}},</p>
<p>A very warm welcome to <strong>{{companyName}}</strong>! We are thrilled to have you join us as <strong>{{jobTitle}}</strong>.</p>
<p>Your journey with us begins today. Please connect with the HR team for any onboarding assistance.</p>
<p>Wishing you a great start and a successful career ahead!</p>
<p>Warm regards,<br>{{companyName}} HR Team</p>',
 'JOINING', 'Sent on the day the candidate joins', true, NOW(), NOW()),

-- 28. Candidate withdrawn → Candidate
(gen_random_uuid(),
 'Withdrawal Confirmation',
 'Application Withdrawal Confirmed — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>We have noted your request to withdraw your application for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>.</p>
<p>We respect your decision and hope you find the perfect opportunity. Should you wish to apply in the future, we would be happy to consider your profile.</p>
<p>Best wishes,<br>{{companyName}} Talent Acquisition Team</p>',
 'OUTCOME', 'Sent when candidate withdraws application', true, NOW(), NOW()),

-- 29. Verification failed → Candidate
(gen_random_uuid(),
 'Verification Failed — Application Update',
 'Important: Issue with your document verification — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>We regret to inform you that we encountered issues during the document verification process for your application for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>
<p>As a result, we are unable to proceed with your application at this time. If you believe this is an error, please contact us immediately.</p>
<p>Regards,<br>{{companyName}} HR Team</p>',
 'OUTCOME', 'Sent when document verification fails', true, NOW(), NOW()),

-- 30. Did not join → Candidate
(gen_random_uuid(),
 'Did Not Join — Confirmation',
 'We missed you on your joining date — {{jobTitle}}',
 '<p>Dear {{candidateName}},</p>
<p>We noticed that you did not join on the scheduled date for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>.</p>
<p>If there was an unavoidable circumstance, please reach out to us immediately so we can discuss next steps. Otherwise, we wish you all the best in your future endeavours.</p>
<p>Regards,<br>{{companyName}} HR Team</p>',
 'JOINING', 'Sent when candidate does not show up on joining date', true, NOW(), NOW())

ON CONFLICT (name) DO NOTHING;
