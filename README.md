# HireFlow — Hiring Automation System (ATS)

A production-ready Applicant Tracking System built with:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Shadcn UI + TanStack Query
- **Backend**: Node.js + Express 5 + TypeScript
- **Database**: PostgreSQL + Prisma ORM 5
- **Auth**: JWT + Refresh Tokens + RBAC

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend

```bash
cd backend
cp .env.example .env       # Configure DATABASE_URL and secrets
npm run db:migrate         # Run migrations
npm run db:seed            # Seed roles, permissions, super admin
npm run dev                # Start dev server (port 5000)
```

**Default login:** `admin@company.com` / `Admin@123`

### Frontend

```bash
cd frontend
npm install
npm run dev                # Start dev server (port 5173)
```

### API Docs
Visit: `http://localhost:5000/api-docs`

## Architecture

```
backend/src/
  config/         — env, logger, database, swagger
  middlewares/    — auth, rbac, validation, error handling
  modules/        — feature modules (auth, users, masters, ...)
  routes/         — route registry
  services/       — shared services (email)
  utils/          — jwt, hash, response, errors

frontend/src/
  api/            — axios instance with token refresh
  components/     — ui primitives + layout components
  contexts/       — AuthContext
  hooks/          — custom hooks
  pages/          — route-level page components
  routes/         — router + ProtectedRoute
  services/       — API service layer
  types/          — shared TypeScript types
```

## Roles
| Role | Description |
|------|-------------|
| `super_admin` | Full access |
| `hr` | Create jobs, manage candidates, interviews, offers |
| `hiring_manager` | View assigned jobs, review candidates, feedback |
| `department_head` | Approve requisitions, track hiring |
| `interview_panel` | Access assigned interviews, submit feedback |
| `candidate` | Register, apply, track status |
