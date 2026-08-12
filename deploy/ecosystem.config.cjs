// PM2 process definition for the HireFlow hiring app backend.
//
// Usage (from the repo root, after `cd backend && npm run build`):
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save
//
// The app name "hiring-backend" is namespaced so it won't collide with
// PM2 apps already running for other sites on this VPS. Rename it here
// (and in DEPLOY.md) if that name is already taken.
//
// PORT is read from backend/.env by the app itself (see backend/src/config/env.ts),
// so it does NOT need to be duplicated here -- just make sure backend/.env has the
// <BACKEND_PORT> you chose. NODE_ENV=production is set explicitly so the app
// runs in production mode regardless of the shell it's started from.

const path = require('path');

module.exports = {
  apps: [
    {
      name: 'hiring-backend',
      cwd: path.join(__dirname, '..', 'backend'),
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      out_file: path.join(__dirname, '..', 'backend', 'logs', 'pm2-out.log'),
      error_file: path.join(__dirname, '..', 'backend', 'logs', 'pm2-error.log'),
      time: true,
    },
  ],
};
