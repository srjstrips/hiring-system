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

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },

  // Protected routes
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

          // Placeholder routes — built in subsequent phases
          { path: '/jobs', element: <ComingSoon title="Jobs" /> },
          { path: '/candidates', element: <ComingSoon title="Candidates" /> },
          { path: '/applications', element: <ComingSoon title="Applications" /> },
          { path: '/interviews', element: <ComingSoon title="Interviews" /> },
          { path: '/offers', element: <ComingSoon title="Offers" /> },
          { path: '/requisitions', element: <ComingSoon title="Manpower Requisitions" /> },
          { path: '/reports', element: <ComingSoon title="Reports" /> },
          { path: '/users', element: <ComingSoon title="User Management" /> },
          { path: '/roles', element: <ComingSoon title="Roles & Permissions" /> },
          { path: '/profile', element: <ComingSoon title="My Profile" /> },
          { path: '/settings', element: <ComingSoon title="Settings" /> },
        ],
      },
    ],
  },

  // Error pages
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
      <a href="/" className="mt-6 text-blue-600 hover:underline text-sm">
        Go back home
      </a>
    </div>
  );
}
