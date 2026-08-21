import { createBrowserRouter, Navigate, redirect } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import OpenPositionsPage from '@/pages/dashboard/OpenPositionsPage';
import ApplicationsAnalyticsPage from '@/pages/dashboard/ApplicationsAnalyticsPage';
import InterviewDashboardPage from '@/pages/dashboard/InterviewDashboardPage';
import OffersDashboardPage from '@/pages/dashboard/OffersDashboardPage';
import RequisitionsDashboardPage from '@/pages/dashboard/RequisitionsDashboardPage';
import TimeToHirePage from '@/pages/dashboard/TimeToHirePage';
import InsightsPage from '@/pages/insights/InsightsPage';
import UsersPage from '@/pages/users/UsersPage';
import { DepartmentsPage } from '@/pages/masters/DepartmentsPage';
import { SubDepartmentsPage } from '@/pages/masters/SubDepartmentsPage';
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
import AssessmentsPage from '@/pages/assessments/AssessmentsPage';
import AssessmentFormPage from '@/pages/assessments/AssessmentFormPage';
import AssessmentDetailPage from '@/pages/assessments/AssessmentDetailPage';
import AssessmentQuestionsPage from '@/pages/assessments/AssessmentQuestionsPage';
import AssessmentAssignPage from '@/pages/assessments/AssessmentAssignPage';
import AssessmentResultsPage from '@/pages/assessments/AssessmentResultsPage';
import AssessmentResultDetailPage from '@/pages/assessments/AssessmentResultDetailPage';
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
import CandidateLoginPage from '@/pages/career/CandidateLoginPage';
import CandidateSignupPage from '@/pages/career/CandidateSignupPage';
import { CandidateProtectedRoute } from './CandidateProtectedRoute';
import CandidateAssessmentTakePage from '@/pages/assessments/CandidateAssessmentTakePage';
import InterviewCallPage from '@/pages/interviews/InterviewCallPage';

export const router = createBrowserRouter([
  {
    path: '/assessment/t/:secureToken',
    element: <CandidateAssessmentTakePage />,
  },
  {
    path: '/interview/call/:token',
    element: <InterviewCallPage />,
  },
  {
    path: '/careers',
    element: <CareerLayout />,
    children: [
      { index: true, element: <CareerHomePage /> },
      { path: 'jobs', element: <CareerJobsPage /> },
      { path: 'jobs/:slug', element: <CareerJobDetailPage /> },
      { path: 'login', element: <CandidateLoginPage /> },
      { path: 'signup', element: <CandidateSignupPage /> },
      {
        path: 'choose-login',
        loader: ({ request }) => redirect(toCareersLogin(request.url)),
      },
      {
        element: <CandidateProtectedRoute />,
        children: [{ path: 'jobs/:slug/apply', element: <ApplyPage /> }],
      },
      { path: 'assessment/:applicationId', element: <AssessmentPage /> },
    ],
  },

  { path: '/', element: <Navigate to="/careers" replace /> },

  {
    path: '/login',
    loader: ({ request }) => redirect(toCareersLogin(request.url)),
  },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/dashboard/open-positions', element: <OpenPositionsPage /> },
          { path: '/dashboard/applications', element: <ApplicationsAnalyticsPage /> },
          { path: '/dashboard/interviews', element: <InterviewDashboardPage /> },
          { path: '/dashboard/offers', element: <OffersDashboardPage /> },
          { path: '/dashboard/requisitions', element: <RequisitionsDashboardPage /> },
          { path: '/dashboard/time-to-hire', element: <TimeToHirePage /> },

          { path: '/insights', element: <InsightsPage /> },

          { path: '/masters/departments', element: <DepartmentsPage /> },
          { path: '/masters/sub-departments', element: <SubDepartmentsPage /> },
          { path: '/masters/designations', element: <DesignationsPage /> },
          { path: '/masters/locations', element: <LocationsPage /> },
          { path: '/masters/skills', element: <SkillsPage /> },
          { path: '/masters/employment-types', element: <EmploymentTypesPage /> },
          { path: '/masters/experience-levels', element: <ExperienceLevelsPage /> },
          { path: '/masters/interview-types', element: <InterviewTypesPage /> },
          { path: '/masters/education', element: <EducationPage /> },
          { path: '/masters/recruitment-sources', element: <RecruitmentSourcesPage /> },

          { path: '/jobs', element: <JobsPage /> },
          { path: '/jobs/create', element: <JobFormPage /> },
          { path: '/jobs/:id', element: <JobDetailPage /> },
          { path: '/jobs/:id/edit', element: <JobFormPage /> },
          { path: '/jobs/:id/assessment', element: <AssessmentBuilderPage /> },

          { path: '/assessments', element: <AssessmentsPage /> },
          { path: '/assessments/new', element: <AssessmentFormPage /> },
          { path: '/assessments/:id', element: <AssessmentDetailPage /> },
          { path: '/assessments/:id/edit', element: <AssessmentFormPage /> },
          { path: '/assessments/:id/questions', element: <AssessmentQuestionsPage /> },
          { path: '/assessments/:id/assign', element: <AssessmentAssignPage /> },
          { path: '/assessments/:id/results', element: <AssessmentResultsPage /> },
          { path: '/assessments/:id/results/:assignmentId', element: <AssessmentResultDetailPage /> },

          { path: '/applications', element: <ApplicationsPage /> },
          { path: '/applications/:id', element: <ApplicationDetailPage /> },

          { path: '/candidates', element: <CandidatesPage /> },
          { path: '/candidates/:id', element: <CandidateDetailPage /> },

          { path: '/offers', element: <OffersPage /> },
          { path: '/requisitions', element: <RequisitionsPage /> },
          { path: '/interviews', element: <InterviewDashboardPage /> },

          { path: '/users', element: <UsersPage /> },
          { path: '/roles', element: <ComingSoon title="Roles & Permissions" /> },
          { path: '/reports', element: <Navigate to="/insights" replace /> },
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

/** Legacy login URLs → one canonical page. Preserves query string. No auth hooks. */
function toCareersLogin(requestUrl: string) {
  const qs = new URL(requestUrl).searchParams.toString();
  return qs ? `/careers/login?${qs}` : '/careers/login';
}

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
      <a href="/" className="mt-6 text-[#FF6B00] hover:underline text-sm">Go back home</a>
    </div>
  );
}
