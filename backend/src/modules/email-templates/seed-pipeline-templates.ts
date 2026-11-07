/**
 * Seeds professional HTML email templates for every SRJ pipeline stage.
 * Safe to re-run: skips stages that already have an active template.
 *
 * Run with:
 *   npx tsx src/modules/email-templates/seed-pipeline-templates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Shared design helpers ────────────────────────────────────────────────────

const LOGO_URL = 'https://careers.srjsteel.in/career-assets/srj-logo-dark.png';
const ORANGE   = '#e36c09';
const PORTAL   = 'https://careers.srjsteel.in';

function css() {
  return `
    :root { color-scheme: light; }
    body { margin:0; padding:0; background-color:#f4f5f7 !important; font-family:Arial,Helvetica,sans-serif; color:#222222; line-height:1.55; }
    img  { border:0; outline:none; text-decoration:none; }
    a    { color:${ORANGE}; }
    .ew  { width:100%; padding:25px 10px; box-sizing:border-box; background-color:#f4f5f7 !important; }
    .ec  { width:100%; max-width:680px; margin:0 auto; background-color:#ffffff !important; box-sizing:border-box; }
    .lh  { background-color:#ffffff !important; text-align:center; padding:25px 20px; border-bottom:1px solid #eeeeee; }
    .logo{ display:block; width:190px; max-width:80%; height:auto; margin:0 auto; }
    .cnt { padding:35px 40px; font-size:14px; background-color:#ffffff !important; color:#222222 !important; }
    .cnt p{ margin:0 0 18px 0; color:#222222 !important; }
    .cnt li { color:#222222 !important; }
    .cnt strong { color:#111111 !important; }
    .box { background-color:#fff8f1 !important; border-left:4px solid ${ORANGE}; padding:16px 20px; margin:20px 0; font-size:14px; }
    .box p{ margin:0 0 8px 0; }
    .box p:last-child{ margin:0; }
    .bw  { text-align:center; margin:28px 0; }
    .btn { display:inline-block; background-color:${ORANGE} !important; color:#ffffff !important; text-decoration:none; font-size:15px; font-weight:bold; padding:14px 36px; border-radius:4px; letter-spacing:0.3px; }
    .lf  { font-size:12px; color:#666666; text-align:center; margin-bottom:20px; word-break:break-all; }
    .lf a{ color:${ORANGE}; }
    a.web{ color:${ORANGE}; text-decoration:underline; }
    /* Gmail dark mode overrides */
    u + #body .ew  { background-color:#f4f5f7 !important; }
    u + #body .ec  { background-color:#ffffff !important; }
    u + #body .lh  { background-color:#ffffff !important; }
    u + #body .cnt { background-color:#ffffff !important; color:#222222 !important; }
    u + #body .box { background-color:#fff8f1 !important; }
    u + #body .btn { background-color:${ORANGE} !important; color:#ffffff !important; }
    [data-ogsc] .ew  { background-color:#f4f5f7 !important; }
    [data-ogsc] .ec  { background-color:#ffffff !important; }
    [data-ogsc] .lh  { background-color:#ffffff !important; }
    [data-ogsc] .cnt { background-color:#ffffff !important; color:#222222 !important; }
    [data-ogsc] .cnt p, [data-ogsc] .cnt li { color:#222222 !important; }
    [data-ogsc] .cnt strong { color:#111111 !important; }
    [data-ogsc] .box { background-color:#fff8f1 !important; }
    [data-ogsc] .btn { background-color:${ORANGE} !important; color:#ffffff !important; }
    @media only screen and (max-width:600px){
      .ew  { padding:10px 5px; }
      .lh  { padding:20px 15px; }
      .cnt { padding:25px 20px; }
    }
  `.trim();
}

function wrap(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
  <style>${css()}</style>
</head>
<body id="body" bgcolor="#f4f5f7" style="margin:0;padding:0;background-color:#f4f5f7;">
<div class="ew" style="background-color:#f4f5f7;">
  <div class="ec" style="background-color:#ffffff;">
    <div class="lh" style="background-color:#ffffff;">
      <a href="${PORTAL}" target="_blank" style="text-decoration:none;display:block;">
        <img src="${LOGO_URL}" alt="SRJ Group" class="logo">
      </a>
    </div>
    <div class="cnt" style="background-color:#ffffff;">
${content}
      <p><strong>Warm Regards,</strong></p>
      <p>
        <strong>Human Resources Department</strong><br>
        <strong>SRJ Group</strong><br>
        Website: <a href="${PORTAL}" target="_blank" class="web">careers.srjsteel.in</a>
      </p>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ─── Template definitions ─────────────────────────────────────────────────────

interface TemplateSpec {
  name:        string;
  category:    string;
  subject:     string;
  description: string;
  body:        string;
}

const TEMPLATES: TemplateSpec[] = [

  // ── 1. APPLIED ─────────────────────────────────────────────────────────────
  {
    name:        'SRJ — Application Received',
    category:    'APPLIED',
    subject:     'We Have Received Your Application — {{job_title}} | SRJ Group',
    description: 'Auto-sent when a candidate submits their application.',
    body: wrap('Application Received', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Thank you for applying to SRJ Group!</strong></p>
      <p>
        We have successfully received your application for the position of
        <strong>{{job_title}}</strong>.
        Our recruitment team will carefully review your profile and reach out to you
        within 5–7 business days.
      </p>
      <p>
        You do not need to take any action at this stage. We will contact you directly
        with next steps once the initial review is complete.
      </p>
      <p>
        We appreciate your interest in joining <strong>SRJ Group</strong> and look
        forward to learning more about you.
      </p>
`),
  },

  // ── 2. SCREENING ──────────────────────────────────────────────────────────
  {
    name:        'SRJ — Screening Stage Notification',
    category:    'SCREENING',
    subject:     'Your Application Is Under Review — {{job_title}} | SRJ Group',
    description: 'Auto-sent when candidate is moved to the Screening stage.',
    body: wrap('Application Under Review', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        We are pleased to inform you that your application for the position of
        <strong>{{job_title}}</strong> has been shortlisted for the
        <strong>Screening Stage</strong>.
      </p>
      <p>
        Our team is reviewing your profile in detail. You may be contacted shortly
        with further instructions or an invitation to the next stage.
      </p>
      <p>
        Please ensure your contact details are up to date and keep an eye on your inbox.
      </p>
`),
  },

  // ── 3. DEPT_WORKING_TEST ─────────────────────────────────────────────────
  {
    name:        'SRJ — Department Working Test Invitation',
    category:    'DEPT_WORKING_TEST',
    subject:     'Department Working Test Invitation — {{job_title}} | SRJ Group',
    description: 'Auto-sent when candidate is moved to the Department Working Test stage.',
    body: wrap('Department Working Test', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        Congratulations on clearing the previous stage! As the next step in our
        selection process for the <strong>{{job_title}}</strong> position, we invite
        you to complete a <strong>Department Working Test</strong>.
      </p>
      <p>
        This test assesses your functional knowledge and practical skills relevant to
        the role.
      </p>
      <div class="box">
        <p><strong>Test Details</strong></p>
        <p><strong>Test Name:</strong> {{assessment_name}}</p>
        <p><strong>Duration:</strong> {{assessment_duration}} Minutes</p>
        <p><strong>Mode:</strong> Online</p>
      </div>
      <p><strong>Instructions:</strong></p>
      <ul>
        <li>Ensure you have a stable internet connection before starting.</li>
        <li>Complete the test in one sitting once you begin.</li>
        <li>Answer all questions honestly and to the best of your ability.</li>
      </ul>
      <div class="bw">
        <a href="{{assessment_link}}" target="_blank" class="btn">Start Test &rarr;</a>
      </div>
      <p class="lf">
        If the button does not work, copy and paste this link into your browser:<br>
        <a href="{{assessment_link}}">{{assessment_link}}</a>
      </p>
      <p>
        Candidates who successfully clear this round will be invited for the interview stage.
      </p>
`),
  },

  // ── 4. HOD_HR_INTERVIEW ──────────────────────────────────────────────────
  {
    name:        'SRJ — HOD & HR Interview Invitation',
    category:    'HOD_HR_INTERVIEW',
    subject:     'Interview Scheduled: HOD & HR Round — {{job_title}} | SRJ Group',
    description: 'Auto-sent when candidate is moved to the HOD + HR Interview stage.',
    body: wrap('HOD & HR Interview Scheduled', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        We are pleased to invite you for the <strong>HOD &amp; HR Interview</strong>
        for the position of <strong>{{job_title}}</strong> at SRJ Group.
      </p>
      <div class="box">
        <p><strong>Interview Details</strong></p>
        <p><strong>Date &amp; Time:</strong> {{interview_date}}</p>
        <p><strong>Mode:</strong> {{interview_mode}}</p>
        <p><strong>Duration:</strong> {{interview_duration}} Minutes</p>
        <p><strong>Location / Link:</strong> {{interview_location}}{{meeting_link}}</p>
      </div>
      <p>
        If the interview is conducted via video call, please use the link below to join:
      </p>
      <div class="bw">
        <a href="{{meeting_link}}" target="_blank" class="btn">Join Interview &rarr;</a>
      </div>
      <p><strong>To prepare:</strong></p>
      <ul>
        <li>Keep a copy of your resume and application documents ready.</li>
        <li>Be punctual — join / arrive 5 minutes before the scheduled time.</li>
        <li>Dress professionally for the interview.</li>
      </ul>
      <p>
        Please reply to this email to confirm your availability. If you are unable to
        attend, kindly inform us at the earliest so we can reschedule.
      </p>
`),
  },

  // ── 5. DIRECTOR_INTERVIEW ────────────────────────────────────────────────
  {
    name:        'SRJ — Director Interview Invitation',
    category:    'DIRECTOR_INTERVIEW',
    subject:     'Final Interview Scheduled: Director Round — {{job_title}} | SRJ Group',
    description: 'Auto-sent when candidate is moved to the Director Interview stage.',
    body: wrap('Director Interview Scheduled', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        Congratulations on progressing to the final stage of our selection process!
        We are delighted to invite you for a <strong>Director Interview</strong>
        for the position of <strong>{{job_title}}</strong> at SRJ Group.
      </p>
      <div class="box">
        <p><strong>Interview Details</strong></p>
        <p><strong>Date &amp; Time:</strong> {{interview_date}}</p>
        <p><strong>Mode:</strong> {{interview_mode}}</p>
        <p><strong>Duration:</strong> {{interview_duration}} Minutes</p>
        <p><strong>Location / Link:</strong> {{interview_location}}{{meeting_link}}</p>
      </div>
      <div class="bw">
        <a href="{{meeting_link}}" target="_blank" class="btn">Join Interview &rarr;</a>
      </div>
      <p>
        This is the final interview round. We encourage you to review your work
        experience, key achievements, and alignment with SRJ Group&apos;s values.
      </p>
      <p>
        Please confirm your availability by replying to this email. We look forward
        to speaking with you.
      </p>
`),
  },

  // ── 6. SHORTLISTED ───────────────────────────────────────────────────────
  {
    name:        'SRJ — Candidate Shortlisted',
    category:    'SHORTLISTED',
    subject:     'Congratulations! You Have Been Shortlisted — {{job_title}} | SRJ Group',
    description: 'Auto-sent when candidate is marked as Shortlisted.',
    body: wrap('You Have Been Shortlisted!', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group!</strong></p>
      <p>
        We are thrilled to inform you that you have been <strong>shortlisted</strong>
        for the position of <strong>{{job_title}}</strong> at SRJ Group following the
        successful completion of our interview rounds.
      </p>
      <p>
        This is a significant milestone and a reflection of your skills, experience,
        and the impression you made during our selection process.
      </p>
      <p>
        Our HR team will contact you shortly with the next steps, which will include
        document verification and offer formalities.
      </p>
      <p>
        Once again, congratulations and welcome to the SRJ Group family!
      </p>
`),
  },

  // ── 7. DOCUMENT_VERIFICATION ─────────────────────────────────────────────
  {
    name:        'SRJ — Document Submission Required',
    category:    'DOCUMENT_VERIFICATION',
    subject:     'Action Required: Submit Your Documents — {{job_title}} | SRJ Group',
    description: 'Auto-sent when candidate enters the Document Verification stage.',
    body: wrap('Document Submission Required', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        Congratulations on reaching the Document Verification stage for the position
        of <strong>{{job_title}}</strong> at SRJ Group.
      </p>
      <p>
        Kindly submit the following documents at the earliest to allow us to proceed
        with your offer formalities:
      </p>
      <ul>
        <li>Aadhaar Card / PAN Card (Government-issued Photo ID)</li>
        <li>Educational Certificates (10th, 12th, Graduation / Post-Graduation)</li>
        <li>Previous Employment Offer Letters / Experience Certificates</li>
        <li>Last 3 Months&apos; Salary Slips</li>
        <li>Bank Account Details (cancelled cheque or passbook copy)</li>
        <li>2 Recent Passport-size Photographs</li>
      </ul>
      <p>
        Please email the documents to our HR team or submit them in person at the
        time specified by our representative.
      </p>
      <p>
        If you have any questions, please do not hesitate to reach out to us.
      </p>
`),
  },

  // ── 8. OFFER_LETTER ──────────────────────────────────────────────────────
  {
    name:        'SRJ — Offer Letter Issued',
    category:    'OFFER_LETTER',
    subject:     'Your Offer Letter — {{job_title}} at SRJ Group',
    description: 'Auto-sent when candidate is moved to the Offer Letter stage.',
    body: wrap('Your Offer Letter from SRJ Group', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group!</strong></p>
      <p>
        We are delighted to offer you the position of <strong>{{job_title}}</strong>
        at <strong>SRJ Group</strong>.
      </p>
      <p>
        Your offer letter has been shared with you directly by our HR representative
        along with all compensation and joining details. Please review it carefully
        and confirm your acceptance at the earliest.
      </p>
      <p>
        Should you have any queries regarding the offer, feel free to reach out to
        our HR team. We are happy to assist.
      </p>
      <p>
        We look forward to welcoming you to the SRJ Group family!
      </p>
`),
  },

  // ── 9. OFFER_ACCEPTED ────────────────────────────────────────────────────
  {
    name:        'SRJ — Offer Accepted Confirmation',
    category:    'OFFER_ACCEPTED',
    subject:     'Welcome to SRJ Group! Offer Acceptance Confirmed — {{job_title}}',
    description: 'Auto-sent when candidate accepts the offer.',
    body: wrap('Offer Accepted — Welcome!', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group!</strong></p>
      <p>
        We are thrilled to confirm that you have accepted our offer for the position
        of <strong>{{job_title}}</strong> at SRJ Group.
      </p>
      <p>
        Your joining details — including the date, time, and reporting location — will
        be shared with you shortly by our HR team.
      </p>
      <p>
        Please keep the following items ready for your first day:
      </p>
      <ul>
        <li>Original copies of all submitted documents</li>
        <li>Passport-size photographs (2 copies)</li>
        <li>A valid government-issued photo ID</li>
      </ul>
      <p>
        We look forward to having you on board. Welcome to the SRJ Group family!
      </p>
`),
  },

  // ── 10. VERIFICATION_COMPLETED ───────────────────────────────────────────
  {
    name:        'SRJ — Verification Completed',
    category:    'VERIFICATION_COMPLETED',
    subject:     'Document Verification Successful — {{job_title}} | SRJ Group',
    description: 'Auto-sent when document verification is successfully completed.',
    body: wrap('Document Verification Successful', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        We are pleased to inform you that your document verification for the position
        of <strong>{{job_title}}</strong> has been successfully completed.
      </p>
      <p>
        We are now proceeding with the final offer formalities. Our HR team will
        be in touch with you shortly to confirm your joining date and other details.
      </p>
      <p>
        Thank you for your cooperation and prompt submission of documents.
      </p>
`),
  },

  // ── 11. JOINING ─────────────────────────────────────────────────────────
  {
    name:        'SRJ — Joining Details',
    category:    'JOINING',
    subject:     'Your Joining Details — {{job_title}} at SRJ Group',
    description: 'Auto-sent when candidate is moved to the Joining stage.',
    body: wrap('Your Joining Details', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group!</strong></p>
      <p>
        We are excited to confirm your joining for the position of
        <strong>{{job_title}}</strong> at SRJ Group.
      </p>
      <div class="box">
        <p><strong>Joining Details</strong></p>
        <p><strong>Reporting Time:</strong> 9:30 AM</p>
        <p><strong>Report To:</strong> Human Resources Department</p>
        <p><strong>Contact Person:</strong> {{hr_name}}</p>
      </div>
      <p>
        Please carry the following on your first day:
      </p>
      <ul>
        <li>Original ID proof (Aadhaar / PAN / Passport)</li>
        <li>Original educational certificates</li>
        <li>Passport-size photographs (2 copies)</li>
        <li>A copy of your signed offer letter</li>
      </ul>
      <p>
        If you have any questions before your joining date, please feel free to
        contact your HR representative.
      </p>
      <p>
        We look forward to welcoming you on board. See you soon!
      </p>
`),
  },

  // ── 12. OFFER_DECLINED ──────────────────────────────────────────────────
  {
    name:        'SRJ — Offer Declined Acknowledgement',
    category:    'OFFER_DECLINED',
    subject:     'Thank You for Your Time — {{job_title}} at SRJ Group',
    description: 'Auto-sent when a candidate declines the offer.',
    body: wrap('Thank You for Your Time', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        We acknowledge that you have chosen to decline the offer for the position
        of <strong>{{job_title}}</strong> at SRJ Group.
      </p>
      <p>
        We understand that career decisions are important and deeply personal.
        We respect your decision and appreciate the time and effort you invested
        throughout our selection process.
      </p>
      <p>
        We will keep your profile on record and may reach out to you should a
        suitable opportunity arise in the future.
      </p>
      <p>
        We wish you all the very best in your future endeavours.
      </p>
`),
  },

  // ── 13. VERIFICATION_FAILED ─────────────────────────────────────────────
  {
    name:        'SRJ — Verification Issue Notification',
    category:    'VERIFICATION_FAILED',
    subject:     'Important: Update on Your Application — {{job_title}} | SRJ Group',
    description: 'Auto-sent when document verification fails.',
    body: wrap('Update on Your Application', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        We regret to inform you that we encountered an issue during the document
        verification process for your application for the position of
        <strong>{{job_title}}</strong> at SRJ Group.
      </p>
      <p>
        As a result, we are unable to proceed with your application at this stage.
        If you believe this is an error or if you have additional documentation to
        support your profile, please contact our HR team immediately.
      </p>
      <p>
        We appreciate the time you invested in our selection process and wish you
        the very best in your career journey.
      </p>
`),
  },

  // ── 14. DID_NOT_JOIN ────────────────────────────────────────────────────
  {
    name:        'SRJ — Did Not Join Notification',
    category:    'DID_NOT_JOIN',
    subject:     'We Missed You on Your Joining Date — {{job_title}} | SRJ Group',
    description: 'Auto-sent when a candidate does not report on the joining date.',
    body: wrap('We Missed You', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        We noticed that you did not report for joining on the scheduled date for the
        position of <strong>{{job_title}}</strong> at SRJ Group.
      </p>
      <p>
        If there was an unavoidable circumstance that prevented you from joining,
        please reach out to our HR team immediately so we can discuss the next steps.
      </p>
      <p>
        Please note that failure to report without prior communication may result in
        the withdrawal of the offer.
      </p>
      <p>
        We hope to hear from you soon and wish you all the best.
      </p>
`),
  },

  // ── 15. POSITION_CLOSED ─────────────────────────────────────────────────
  {
    name:        'SRJ — Position Closed',
    category:    'POSITION_CLOSED',
    subject:     'Update on Your Application for {{job_title}} | SRJ Group',
    description: 'Auto-sent when the position a candidate applied for is closed.',
    body: wrap('Application Status Update', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        We wanted to update you regarding your application for the position of
        <strong>{{job_title}}</strong> at SRJ Group.
      </p>
      <p>
        Unfortunately, the position has been <strong>closed</strong> at this time
        due to internal business requirements. This decision is in no way a reflection
        of your profile or candidature.
      </p>
      <p>
        We will retain your profile in our talent database and will consider you for
        relevant future opportunities as they arise.
      </p>
      <p>
        We sincerely appreciate your interest in SRJ Group and thank you for the
        time you invested in our recruitment process.
      </p>
`),
  },

  // ── 16. CANDIDATE_UNRESPONSIVE ──────────────────────────────────────────
  {
    name:        'SRJ — Candidate Unresponsive Notice',
    category:    'CANDIDATE_UNRESPONSIVE',
    subject:     'We Are Unable to Reach You — {{job_title}} | SRJ Group',
    description: 'Auto-sent when a candidate is marked as unresponsive.',
    body: wrap('Unable to Reach You', `
      <p>Dear {{candidate_name}},</p>
      <p><strong>Greetings from SRJ Group.</strong></p>
      <p>
        We have made several attempts to contact you regarding your application for
        the position of <strong>{{job_title}}</strong> at SRJ Group, but have been
        unable to reach you.
      </p>
      <p>
        If you are still interested in this opportunity, please reply to this email
        or contact our HR team at the earliest. We would be happy to continue with
        your application.
      </p>
      <p>
        Please note that if we do not hear from you within <strong>3 business days</strong>,
        we may have to consider other candidates and close your application.
      </p>
      <p>
        We hope to hear from you soon.
      </p>
`),
  },

];

// ─── Seeder ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding pipeline email templates…\n');
  let created = 0;
  let skipped = 0;

  for (const t of TEMPLATES) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { category: t.category, isActive: true },
      select: { id: true, name: true },
    });

    if (existing) {
      console.log(`  SKIP  ${t.category.padEnd(25)} (exists: "${existing.name}")`);
      skipped++;
      continue;
    }

    await prisma.emailTemplate.create({
      data: {
        name:        t.name,
        subject:     t.subject,
        body:        t.body,
        category:    t.category,
        description: t.description,
        isActive:    true,
      },
    });

    console.log(`  CREATE ${t.category.padEnd(25)} "${t.name}"`);
    created++;
  }

  console.log(`\nDone. Created: ${created}  |  Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
