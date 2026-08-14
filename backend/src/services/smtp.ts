import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export function resolveSmtpSecure(port: number, explicit?: boolean) {
  if (typeof explicit === 'boolean') return explicit;
  return port === 465;
}

export function isSmtpConfigured(user?: string, pass?: string) {
  const u = (user ?? '').trim();
  const p = (pass ?? '').trim();
  if (!u || !p) return false;
  if (p === 'your_app_password' || p === '<PRODUCTION_EMAIL_APP_PASSWORD>') return false;
  return true;
}

export function createSmtpTransport(opts: {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  tlsRejectUnauthorized?: boolean;
}) {
  const port = opts.port || 587;
  const secure = resolveSmtpSecure(port, opts.secure);
  const configured = isSmtpConfigured(opts.user, opts.pass);

  const options: SMTPTransport.Options = {
    host: opts.host || 'smtp.gmail.com',
    port,
    secure,
    requireTLS: !secure && port === 587,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    tls: {
      rejectUnauthorized: opts.tlsRejectUnauthorized !== false,
      minVersion: 'TLSv1.2',
    },
  };

  if (configured) {
    options.auth = { user: opts.user!.trim(), pass: opts.pass!.trim() };
  }

  return {
    transporter: nodemailer.createTransport(options),
    configured,
    host: options.host as string,
    port,
    secure,
  };
}

export function formatSmtpError(error: unknown) {
  const err = error as {
    message?: string;
    code?: string;
    command?: string;
    response?: string;
    responseCode?: number;
  };
  const parts = [
    err?.code,
    err?.command,
    err?.responseCode != null ? String(err.responseCode) : undefined,
    err?.response,
    err?.message,
  ].filter(Boolean);
  return parts.join(' | ') || 'Unknown SMTP error';
}
