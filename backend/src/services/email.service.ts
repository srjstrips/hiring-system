import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

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
      // Don't throw — email failures shouldn't break the main flow
    }
  }

  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.send({
      to: email,
      subject: 'Reset Your Password — Hiring System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #2563eb; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            Hiring Automation System | Do not reply to this email
          </p>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(email: string, name: string, tempPassword?: string): Promise<void> {
    const loginUrl = `${env.FRONTEND_URL}/login`;

    await this.send({
      to: email,
      subject: 'Welcome to the Hiring System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to the Hiring System!</h2>
          <p>Hello ${name},</p>
          <p>Your account has been created successfully.</p>
          ${tempPassword ? `
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          <p>Please change your password after first login.</p>
          ` : ''}
          <p style="margin: 30px 0;">
            <a href="${loginUrl}"
               style="background-color: #2563eb; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Login Now
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            Hiring Automation System | Do not reply to this email
          </p>
        </div>
      `,
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
      `<strong>Role:</strong> ${jobTitle}`,
      department ? `<strong>Department:</strong> ${department}` : '',
      location ? `<strong>Location:</strong> ${location}` : '',
    ].filter(Boolean).join('<br/>');

    await this.send({
      to: email,
      subject: `Application received — ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ea580c;">Application submitted successfully</h2>
          <p>Hello ${candidateName},</p>
          <p>Thank you for applying. We have received your application.</p>
          <p>${details}</p>
          <p>Our HR team will review your profile first. If shortlisted, you will move through screening and interview rounds. We will email you at each step.</p>
          <p style="margin: 30px 0;">
            <a href="${careersUrl}"
               style="background-color: #ea580c; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Browse more jobs
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            SRJ Hiring | Do not reply to this email
          </p>
        </div>
      `,
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
    const {
      email,
      candidateName,
      jobTitle,
      round,
      scheduledAt,
      durationMinutes,
      interviewUrl,
      mode = 'VIDEO',
      location,
    } = params;
    const when = scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const isVideo = mode === 'VIDEO';

    await this.send({
      to: email,
      subject: `${isVideo ? 'Video' : 'In-person'} interview scheduled — ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ea580c;">You're invited to an interview</h2>
          <p>Hello ${candidateName},</p>
          <p>Your interview has been scheduled. Please find the details below.</p>
          <p>
            <strong>Role:</strong> ${jobTitle}<br/>
            <strong>Round:</strong> ${round}<br/>
            <strong>When:</strong> ${when}<br/>
            <strong>Duration:</strong> ${durationMinutes} minutes<br/>
            <strong>Mode:</strong> ${isVideo ? 'Video call' : 'In person'}
            ${!isVideo && location ? `<br/><strong>Location:</strong> ${location}` : ''}
          </p>
          ${
            isVideo && interviewUrl
              ? `<p style="margin: 30px 0;">
            <a href="${interviewUrl}"
               style="background-color: #ea580c; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Join video interview
            </a>
          </p>
          <p style="color: #6b7280; font-size: 13px;">Allow camera and microphone when the browser asks.</p>`
              : ''
          }
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 12px;">SRJ Hiring | Do not reply to this email</p>
        </div>
      `,
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
    await this.send({
      to: email,
      subject: `Complete your assessment — ${assessmentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ea580c;">Assessment Invitation</h2>
          <p>Hello ${candidateName},</p>
          <p>Please complete your assessment using the link below.</p>
          <p><strong>Assessment:</strong> ${assessmentName}<br/>
             <strong>Duration:</strong> ${durationMins} minutes</p>
          <p style="margin: 30px 0;">
            <a href="${assessmentUrl}"
               style="background-color: #ea580c; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Start Assessment
            </a>
          </p>
          <p style="color: #6b7280; font-size: 13px;">
            Use a desktop/laptop browser. Camera, microphone, and screen sharing will be required before you begin.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            SRJ Hiring | Do not reply to this email
          </p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
