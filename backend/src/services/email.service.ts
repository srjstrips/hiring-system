import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { wrapEmail } from './email-wrapper';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        ...options,
      });
      logger.info(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
    }
  }

  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    const body = `
      <h2 style="margin:0 0 16px;color:#111827;font-size:22px;">Password Reset Request</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to set a new password.</p>
      <p style="margin:28px 0;">
        <a href="${resetUrl}" style="background:#b45309;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">This link expires in <strong>1 hour</strong>. If you did not request this, you can safely ignore this email.</p>
    `;
    await this.send({
      to: email,
      subject: 'Reset Your Password — SRJ Hiring',
      html: await wrapEmail(body),
    });
  }

  async sendWelcomeEmail(email: string, name: string, tempPassword?: string): Promise<void> {
    const loginUrl = `${env.FRONTEND_URL}/login`;
    const body = `
      <h2 style="margin:0 0 16px;color:#111827;font-size:22px;">Welcome to SRJ Hiring! 🎉</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your account has been created successfully. You can now log in to the hiring portal.</p>
      ${tempPassword ? `
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:14px;"><strong>Temporary Password:</strong> <code style="background:#fff;padding:2px 8px;border-radius:4px;">${tempPassword}</code></p>
        <p style="margin:8px 0 0;font-size:13px;color:#92400e;">Please change your password after your first login.</p>
      </div>
      ` : ''}
      <p style="margin:28px 0;">
        <a href="${loginUrl}" style="background:#b45309;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">
          Login Now
        </a>
      </p>
    `;
    await this.send({
      to: email,
      subject: 'Welcome to SRJ Hiring System',
      html: await wrapEmail(body),
    });
  }

  async sendApplicationReceivedEmail(params: {
    email: string;
    candidateName: string;
    jobTitle: string;
    department?: string;
    location?: string;
  }): Promise<void> {
    const { email, candidateName, jobTitle, department, location } = params;
    const careersUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/careers/jobs`;
    const details = [
      `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:130px;">Position</td><td style="padding:8px 0;font-weight:600;">${jobTitle}</td></tr>`,
      department ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Department</td><td style="padding:8px 0;">${department}</td></tr>` : '',
      location ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Location</td><td style="padding:8px 0;">${location}</td></tr>` : '',
    ].filter(Boolean).join('');

    const body = `
      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Application Received! ✅</h2>
      <p>Hello <strong>${candidateName}</strong>,</p>
      <p>Thank you for applying to SRJ Group. We have received your application and our HR team will review it shortly.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 12px;font-weight:600;color:#374151;">Application Details</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;">${details}</table>
      </div>

      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#92400e;"><strong>What happens next?</strong></p>
        <p style="margin:8px 0 0;font-size:13px;color:#92400e;">Our HR team will review your profile. If shortlisted, you'll be contacted for screening and interview rounds. We'll email you at each step.</p>
      </div>

      <p style="margin:28px 0;">
        <a href="${careersUrl}" style="background:#b45309;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">
          Browse More Jobs
        </a>
      </p>
    `;
    await this.send({
      to: email,
      subject: `Application Received — ${jobTitle} | SRJ Group`,
      html: await wrapEmail(body),
    });
  }

  async sendInterviewInviteEmail(params: {
    email: string;
    candidateName: string;
    jobTitle: string;
    round: number;
    scheduledAt: Date;
    durationMinutes: number;
    interviewUrl: string;
    mode?: 'VIDEO' | 'IN_PERSON' | string;
    location?: string | null;
  }): Promise<void> {
    const { email, candidateName, jobTitle, round, scheduledAt, durationMinutes, interviewUrl, mode = 'VIDEO', location } = params;
    const when = scheduledAt.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
    const isVideo = mode === 'VIDEO';
    const roundLabel = round === 1 ? 'Round 1' : round === 2 ? 'Round 2' : `Round ${round}`;

    const body = `
      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Interview Invitation 🗓️</h2>
      <p>Hello <strong>${candidateName}</strong>,</p>
      <p>Congratulations! You have been shortlisted for an interview at SRJ Group. Please find the details below.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 12px;font-weight:600;color:#374151;">Interview Details</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:130px;">Position</td><td style="padding:8px 0;font-weight:600;">${jobTitle}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Round</td><td style="padding:8px 0;">${roundLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Date &amp; Time</td><td style="padding:8px 0;font-weight:600;">${when}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Duration</td><td style="padding:8px 0;">${durationMinutes} minutes</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Mode</td><td style="padding:8px 0;">${isVideo ? '📹 Video Call' : '🏢 In Person'}${!isVideo && location ? ` — ${location}` : ''}</td></tr>
        </table>
      </div>

      ${isVideo && interviewUrl ? `
      <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#065f46;"><strong>📹 Video Interview Link Ready</strong></p>
        <p style="margin:8px 0 0;font-size:13px;color:#065f46;">Click the button below at your scheduled time. Allow camera and microphone access when prompted.</p>
      </div>
      <p style="margin:28px 0;">
        <a href="${interviewUrl}" style="background:#b45309;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">
          Join Video Interview
        </a>
      </p>
      ` : ''}

      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#92400e;"><strong>Tips:</strong> Be on time, dress professionally, and test your internet connection before the interview.</p>
      </div>
    `;
    await this.send({
      to: email,
      subject: `Interview Scheduled — ${jobTitle} (${roundLabel}) | SRJ Group`,
      html: await wrapEmail(body),
    });
  }

  async sendAssessmentInviteEmail(params: {
    email: string;
    candidateName: string;
    assessmentName: string;
    assessmentUrl: string;
    durationMins: number;
  }): Promise<void> {
    const { email, candidateName, assessmentName, assessmentUrl, durationMins } = params;
    const body = `
      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">Assessment Invitation 📝</h2>
      <p>Hello <strong>${candidateName}</strong>,</p>
      <p>As part of your application process at SRJ Group, you are required to complete an online assessment.</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 12px;font-weight:600;color:#374151;">Assessment Details</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:130px;">Assessment</td><td style="padding:8px 0;font-weight:600;">${assessmentName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Duration</td><td style="padding:8px 0;">${durationMins} minutes</td></tr>
        </table>
      </div>

      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#92400e;"><strong>⚠️ Important:</strong> Use a desktop or laptop browser. Camera, microphone, and screen sharing will be required. Do not close the tab once started.</p>
      </div>

      <p style="margin:28px 0;">
        <a href="${assessmentUrl}" style="background:#b45309;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">
          Start Assessment
        </a>
      </p>
    `;
    await this.send({
      to: email,
      subject: `Complete Your Assessment — ${assessmentName} | SRJ Group`,
      html: await wrapEmail(body),
    });
  }

  async sendJobAlertEmail(params: {
    email: string;
    candidateName: string;
    frequency: 'WEEKLY' | 'MONTHLY';
    jobs: { title: string; slug: string; department?: string; location?: string }[];
  }): Promise<void> {
    const { email, candidateName, frequency, jobs } = params;
    const base = env.FRONTEND_URL.replace(/\/$/, '');
    const period = frequency === 'WEEKLY' ? 'this week' : 'this month';

    const rows = jobs.map((j) => {
      const meta = [j.department, j.location].filter(Boolean).join(' · ');
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
            <a href="${base}/careers/jobs/${j.slug}" style="color:#111827;font-weight:600;text-decoration:none;font-size:15px;">${j.title}</a>
            ${meta ? `<div style="color:#6b7280;font-size:13px;margin-top:3px;">📍 ${meta}</div>` : ''}
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:middle;">
            <a href="${base}/careers/jobs/${j.slug}" style="background:#b45309;color:#fff;padding:7px 16px;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;white-space:nowrap;">Apply →</a>
          </td>
        </tr>`;
    }).join('');

    const body = `
      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;">New Jobs Picked for You 🎯</h2>
      <p>Hello <strong>${candidateName}</strong>,</p>
      <p>Here are the latest openings matched to your profile ${period}.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;">${rows}</table>
      <p style="margin:28px 0;">
        <a href="${base}/careers/recommended" style="background:#b45309;color:#ffffff;padding:13px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">
          View All Recommendations
        </a>
      </p>
    `;
    await this.send({
      to: email,
      subject: `New Jobs for You at SRJ — ${period}`,
      html: await wrapEmail(body),
    });
  }
}

export const emailService = new EmailService();
