import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import app from './app';
import fs from 'fs';
import path from 'path';

// Ensure required directories exist
const dirs = [
  env.UPLOAD_DIR,
  `${env.UPLOAD_DIR}/resumes`,
  `${env.UPLOAD_DIR}/photos`,
  `${env.UPLOAD_DIR}/documents`,
  `${env.UPLOAD_DIR}/assessment-recordings-private`,
  env.LOG_DIR,
];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function main() {
  await connectDatabase();

  // Periodic retention cleanup (non-blocking)
  const retentionMs = 6 * 60 * 60 * 1000;
  setInterval(() => {
    import('./modules/assessments/recordings.service')
      .then((m) => m.default.purgeExpiredRecordings())
      .catch((err) => logger.error('Recording retention purge failed', err));
  }, retentionMs).unref?.();

  // Weekly/monthly job-alert emails (self-selects who is due)
  import('./modules/career/job-alerts.scheduler')
    .then((m) => m.startJobAlertScheduler())
    .catch((err) => logger.error('Failed to start job alert scheduler', err));

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    logger.info(`API: http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`Docs: http://localhost:${env.PORT}/api-docs`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

main();
