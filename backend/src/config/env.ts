import { z } from 'zod';
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api/v1'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  COOKIE_SECRET: z.string().min(1, 'COOKIE_SECRET is required'),

  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.string().optional().transform((v) => v === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('Hiring System <noreply@company.com>'),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),

  // Assessment recordings — private object storage (local default; optional S3)
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_BUCKET: z.string().optional().default(''),
  STORAGE_REGION: z.string().optional().default(''),
  STORAGE_ACCESS_KEY: z.string().optional().default(''),
  STORAGE_SECRET_KEY: z.string().optional().default(''),
  STORAGE_ENDPOINT: z.string().optional().default(''),
  STORAGE_FORCE_PATH_STYLE: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true')
    .default(false),
  ASSESSMENT_RECORDING_RETENTION_DAYS: z.coerce.number().default(90),
  ASSESSMENT_RECORDING_MAX_CHUNK_MB: z.coerce.number().default(25),
  ASSESSMENT_RECORDING_VIEW_URL_TTL_SECONDS: z.coerce.number().default(600),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('logs'),

  // Job sharing — optional until LinkedIn/Naukri APIs are configured
  LINKEDIN_API_BASE_URL: z.string().optional().default(''),
  LINKEDIN_CLIENT_ID: z.string().optional().default(''),
  LINKEDIN_CLIENT_SECRET: z.string().optional().default(''),
  LINKEDIN_ACCESS_TOKEN: z.string().optional().default(''),
  NAUKRI_API_BASE_URL: z.string().optional().default(''),
  NAUKRI_API_KEY: z.string().optional().default(''),
  NAUKRI_API_SECRET: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
