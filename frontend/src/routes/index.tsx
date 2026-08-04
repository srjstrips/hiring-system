import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { DepartmentsPage } from '@/pages/masters/DepartmentsPage';
import { DesignationsPage } from '@/pages/masters/DesignationsPage';
import { LocationsPage } from '@/pages/masters/LocationsPage';
import { SkillsPage } from '@/pages/masters/SkillsPage';
import { EmploymentTypesPage } from '@/pages/masters/EmploymentTypesPage';
import { ExperienceLevelsPage } from '@/pages/masters/ExperienceLevelsPage';
import { InterviewTypesPage } from '@/pages/masters/InterviewTypesPage';
import { EducationPage } from '@/pages/masters/EducationPage';
import { RecruitmentSourcesPage } from '@/pages/masters/RecruitmentSourcesPage';
import JobsPage from '@/pages/jobs/JobsPage';
import JobFormPage from '@/pages/jobs/JobFormPage';
import JobDetailPage from '@/pages/jobs/JobDetailPage';
import AssessmentBuilderPage from '@/pages/jobs/AssessmentBuilderPage';
import ApplicationsPage from '@/pages/applications/ApplicationsPage';
import ApplicationDetailPage from '@/pages/applications/ApplicationDetailPage';
import EmailTemplatesPage from '@/pages/settings/EmailTemplatesPage';
import CandidatesPage from '@/pages/candidates/CandidatesPage';
import CandidateDetailPage from '@/pages/candidates/CandidateDetailPage';
import OffersPage from '@/pages/offers/OffersPage';
import RequisitionsPage from '@/pages/requisitions/RequisitionsPage';
import CareerLayout from '@/pages/career/CareerLayout';
import CareerHomePage from '@/pages/career/CareerHomePage';
import CareerJobsPage from '@/pages/career/CareerJobsPage';
import CareerJobDetailPage from '@/pages/career/CareerJobDetailPage';
import ApplyPage from '@/pages/career/ApplyPage';
import AssessmentPage from '@/pages/career/AssessmentPage';

export const router = createBrowserRouter([
  // Career portal — public, no auth
  {
    path: '/careers',
    element: <CareerLayout />,
    children: [
      { index: true, element: <CareerHomePage /> },
      { path: 'jobs', element: <CareerJobsPage /> },
      { path: 'jobs/:slug', element: <CareerJobDetailPage /> },
      { path: 'jobs/:slug/apply', element: <ApplyPage /> },
      { path: 'assessment/:applicationId', element: <AssessmentPage /> },
    ],
  },

  // Auth routes
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },

  // Protected HR/Admin routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },

          // Master data
          { path: '/masters/departments', element: <DepartmentsPage /> },
          { path: '/masters/designations', element: <DesignationsPage /> },
          { path: '/masters/locations', element: <LocationsPage /> },
          { path: '/masters/skills', element: <SkillsPage /> },
          { path: '/masters/employment-types', element: <EmploymentTypesPage /> },
          { path: '/masters/experience-levels', element: <ExperienceLevelsPage /> },
          { path: '/masters/interview-types', element: <InterviewTypesPage /> },
          { path: '/masters/education', element: <EducationPage /> },
          { path: '/masters/recruitment-sources', element: <RecruitmentSourcesPage /> },

          // Jobs
          { path: '/jobs', element: <JobsPage /> },
          { path: '/jobs/create', element: <JobFormPage /> },
          { path: '/jobs/:id', element: <JobDetailPage /> },
          { path: '/jobs/:id/edit', element: <JobFormPage /> },
          { path: '/jobs/:id/assessment', element: <AssessmentBuilderPage /> },

          // Applications
          { path: '/applications', element: <ApplicationsPage /> },
          { path: '/applications/:id', element: <ApplicationDetailPage /> },

          // Candidates
          { path: '/candidates', element: <CandidatesPage /> },
          { path: '/candidates/:id', element: <CandidateDetailPage /> },

          // Offers
          { path: '/offers', element: <OffersPage /> },

          // Requisitions
          { path: '/requisitions', element: <RequisitionsPage /> },

          // Other modules (coming)
          { path: '/interviews', element: <ComingSoon title="Interviews" /> },
          { path: '/reports', element: <ComingSoon title="Reports" /> },
          { path: '/users', element: <ComingSoon title="User Management" /> },
          { path: '/roles', element: <ComingSoon title="Roles & Permissions" /> },
          { path: '/profile', element: <ComingSoon title="My Profile" /> },
          { path: '/settings', element: <ComingSoon title="Settings" /> },
          { path: '/settings/email-templates', element: <EmailTemplatesPage /> },
        ],
      },
    ],
  },

  { path: '/403', element: <ErrorPage code={403} message="You don't have permission to view this page" /> },
  { path: '*', element: <ErrorPage code={404} message="Page not found" /> },
]);

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground mt-2">This module is being built. Check back soon!</p>
    </div>
  );
}

function ErrorPage({ code, message }: { code: number; message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <p className="text-8xl font-black text-muted-foreground/30">{code}</p>
      <h1 className="text-2xl font-bold mt-4">{message}</h1>
      <a href="/" className="mt-6 text-blue-600 hover:underline text-sm">Go back home</a>
    </div>
  );
}
