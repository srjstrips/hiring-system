import nodemailer from 'nodemailer';
import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import type { CreateEmailTemplateDto, UpdateEmailTemplateDto, SendEmailDto } from './email-templates.validator';

function resolvePlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
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

  async sendForApplication(applicationId: string, dto: SendEmailDto, sentByName: string) {
    const [template, app] = await Promise.all([
      this.getById(dto.templateId),
      prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          candidate: { select: { firstName: true, lastName: true, email: true } },
          job: { select: { title: true } },
        },
      }),
    ]);

    if (!app) throw new AppError('Application not found', 404);

    const vars: Record<string, string> = {
      candidate_name: `${app.candidate.firstName} ${app.candidate.lastName}`,
      candidate_first_name: app.candidate.firstName,
      candidate_email: app.candidate.email,
      job_title: app.job.title,
      company_name: process.env['COMPANY_NAME'] ?? 'HireFlow',
      hr_name: sentByName,
      portal_link: process.env['CAREER_PORTAL_URL'] ?? 'http://localhost:5173/careers',
      ...dto.extraVariables,
    };

    const toEmail = dto.toEmail ?? app.candidate.email;
    const resolvedSubject = resolvePlaceholders(template.subject, vars);
    const resolvedBody = resolvePlaceholders(template.body, vars);

    if (dto.previewOnly) {
      return { preview: true, to: toEmail, subject: resolvedSubject, body: resolvedBody };
    }

    const transporter = getTransporter();
    if (!transporter) {
      // No SMTP configured — return resolved content so HR can copy-paste
      return {
        preview: true,
        noSmtp: true,
        to: toEmail,
        subject: resolvedSubject,
        body: resolvedBody,
      };
    }

    const fromEmail = process.env['EMAIL_FROM'] ?? process.env['SMTP_USER'];
    const companyName = process.env['COMPANY_NAME'] ?? 'HireFlow';
    await transporter.sendMail({
      from: `"${companyName}" <${fromEmail}>`,
      to: toEmail,
      subject: resolvedSubject,
      text: resolvedBody,
    });

    return { sent: true, to: toEmail, subject: resolvedSubject };
  }
}

export default new EmailTemplatesService();
