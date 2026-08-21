import nodemailer from 'nodemailer';
import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import { buildCandidateAssessmentUrl } from '@/modules/assessments/assessment-url';
import { env } from '@/config/env';
import type { CreateEmailTemplateDto, UpdateEmailTemplateDto, SendEmailDto } from './email-templates.validator';

function resolvePlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function buildMeetingUrl(meetingToken: string | null | undefined, meetingLink: string | null | undefined) {
  if (meetingLink) return meetingLink;
  if (!meetingToken) return '';
  const base = env.FRONTEND_URL.replace(/\/$/, '');
  return `${base}/interview/call/${meetingToken}`;
}

function getTransporter() {
  const host = process.env['SMTP_HOST'];
  const port = Number(process.env['SMTP_PORT'] ?? 587);
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];
  const secure = process.env['SMTP_SECURE'] === 'true';

  if (!host || !user || !pass || pass === 'your_app_password') return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

const STAGE_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW_ROUND_1: 'Interview Round 1',
  INTERVIEW_ROUND_2: 'Interview Round 2',
  HR_ROUND: 'HR Round',
  SELECTED: 'Selected',
  OFFER_SENT: 'Offer Sent',
  OFFER_ACCEPTED: 'Offer Accepted',
  JOINED: 'Joined',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  ON_HOLD: 'On Hold',
};

async function buildApplicationEmailVars(applicationId: string, sentByName: string, stage?: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      candidate: { select: { firstName: true, lastName: true, email: true } },
      job: { select: { title: true } },
    },
  });
  if (!app) throw new AppError('Application not found', 404);

  const [latestInterview, latestAssignment] = await Promise.all([
    prisma.interview.findFirst({
      where: { applicationId },
      orderBy: { scheduledAt: 'desc' },
      select: {
        scheduledAt: true,
        mode: true,
        location: true,
        meetingLink: true,
        meetingToken: true,
        round: true,
        title: true,
        durationMinutes: true,
      },
    }),
    prisma.assessmentAssignment.findFirst({
      where: { applicationId },
      orderBy: { assignedAt: 'desc' },
      select: {
        secureToken: true,
        assessment: { select: { name: true, durationMins: true } },
      },
    }),
  ]);

  const meetingLink = buildMeetingUrl(latestInterview?.meetingToken, latestInterview?.meetingLink);

  const assessmentLink = latestAssignment?.secureToken
    ? buildCandidateAssessmentUrl(latestAssignment.secureToken)
    : '';

  const currentStage = stage ?? app.status;

  return {
    app,
    vars: {
      candidate_name: `${app.candidate.firstName} ${app.candidate.lastName}`,
      candidate_first_name: app.candidate.firstName,
      candidate_email: app.candidate.email,
      job_title: app.job.title,
      company_name: process.env['COMPANY_NAME'] ?? 'SRJ Group',
      hr_name: sentByName,
      portal_link: process.env['CAREER_PORTAL_URL'] ?? process.env['FRONTEND_URL'] ?? 'http://localhost:5173/careers',
      current_stage: currentStage,
      stage_name: STAGE_LABELS[currentStage] ?? currentStage,
      interview_date: latestInterview?.scheduledAt
        ? latestInterview.scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : '',
      interview_mode: latestInterview?.mode === 'IN_PERSON' ? 'In person' : latestInterview ? 'Video call' : '',
      interview_location: latestInterview?.location ?? '',
      meeting_link: meetingLink,
      interview_round: latestInterview ? String(latestInterview.round) : '',
      interview_title: latestInterview?.title ?? '',
      interview_duration: latestInterview ? String(latestInterview.durationMinutes) : '',
      assessment_link: assessmentLink,
      assessment_url: assessmentLink,
      assessment_name: latestAssignment?.assessment?.name ?? '',
      assessment_duration: latestAssignment?.assessment ? String(latestAssignment.assessment.durationMins) : '',
    } as Record<string, string>,
  };
}

class EmailTemplatesService {
  async getAll() {
    return prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getById(id: string) {
    const t = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!t) throw new AppError('Email template not found', 404);
    return t;
  }

  async create(dto: CreateEmailTemplateDto) {
    return prisma.emailTemplate.create({ data: dto });
  }

  async update(id: string, dto: UpdateEmailTemplateDto) {
    await this.getById(id);
    return prisma.emailTemplate.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.getById(id);
    return prisma.emailTemplate.delete({ where: { id } });
  }

  /** Active template whose category matches the pipeline stage (e.g. SCREENING). */
  async findActiveByStage(stage: string) {
    return prisma.emailTemplate.findFirst({
      where: {
        isActive: true,
        category: stage,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async sendForApplication(applicationId: string, dto: SendEmailDto, sentByName: string) {
    const template = await this.getById(dto.templateId);
    const { app, vars } = await buildApplicationEmailVars(applicationId, sentByName);
    Object.assign(vars, dto.extraVariables ?? {});

    const toEmail = dto.toEmail ?? app.candidate.email;
    const resolvedSubject = resolvePlaceholders(template.subject, vars);
    const resolvedBody = resolvePlaceholders(template.body, vars);

    if (dto.previewOnly) {
      return { preview: true, to: toEmail, subject: resolvedSubject, body: resolvedBody };
    }

    const transporter = getTransporter();
    if (!transporter) {
      return {
        preview: true,
        noSmtp: true,
        to: toEmail,
        subject: resolvedSubject,
        body: resolvedBody,
      };
    }

    const fromEmail = process.env['EMAIL_FROM'] ?? process.env['SMTP_USER'];
    const companyName = process.env['COMPANY_NAME'] ?? 'SRJ Group';
    await transporter.sendMail({
      from: `"${companyName}" <${fromEmail}>`,
      to: toEmail,
      subject: resolvedSubject,
      text: resolvedBody,
      html: resolvedBody.replace(/\n/g, '<br/>'),
    });

    return { sent: true, to: toEmail, subject: resolvedSubject };
  }

  /**
   * Auto-send when HR moves a candidate to a stage that has a matching active template.
   * Failures are logged and swallowed so stage updates never fail because of email.
   */
  async sendForStageChange(applicationId: string, stage: string, sentByName: string) {
    try {
      const template = await this.findActiveByStage(stage);
      if (!template) {
        return { skipped: true, reason: 'no_template' as const };
      }

      const result = await this.sendForApplication(
        applicationId,
        { templateId: template.id, previewOnly: false },
        sentByName
      );

      if ((result as any).noSmtp) {
        console.warn(`[email] Stage ${stage} template resolved but SMTP is not configured`);
        return { skipped: true, reason: 'no_smtp' as const, ...result };
      }

      return { sent: true, templateId: template.id, templateName: template.name, ...(result as object) };
    } catch (err) {
      console.error(`[email] Auto stage email failed for ${applicationId} → ${stage}`, err);
      return { skipped: true, reason: 'error' as const };
    }
  }
}

export default new EmailTemplatesService();
export { STAGE_LABELS };
