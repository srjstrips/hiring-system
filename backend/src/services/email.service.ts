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
          <h2 style="color: #2563eb;">Assessment Invitation</h2>
          <p>Hello ${candidateName},</p>
          <p>Please complete your assessment using the link below.</p>
          <p><strong>Assessment:</strong> ${assessmentName}<br/>
             <strong>Duration:</strong> ${durationMins} minutes</p>
          <p style="margin: 30px 0;">
            <a href="${assessmentUrl}"
               style="background-color: #2563eb; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Start Assessment
            </a>
          </p>
          <p style="color: #6b7280; font-size: 13px;">
            Use a desktop/laptop browser. Camera, microphone, and screen sharing will be required before you begin.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            HireFlow ATS | Do not reply to this email
          </p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
