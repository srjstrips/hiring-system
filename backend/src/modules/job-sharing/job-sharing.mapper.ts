import { env } from '../../config/env';
import type { ExternalJobPayload } from './platforms/types';

type JobWithRelations = {
  id: string;
  title: string;
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  salaryMin: unknown;
  salaryMax: unknown;
  showSalary: boolean;
  numberOfPositions: number;
  closingDate: Date | null;
  department: { name: string };
  designation: { name: string };
  location: { name: string; city: string; state: string; country: string };
  employmentType: { name: string } | null;
  experienceLevel: { name: string } | null;
  skills: Array<{ skill: { name: string } }>;
};

/**
 * Centralized RMS → external platform field mapping.
 * Platform adapters receive this payload; they must not re-read Prisma models.
 */
export function mapJobToExternalPayload(job: JobWithRelations): ExternalJobPayload {
  const careerBase = env.FRONTEND_URL.replace(/\/$/, '');

  return {
    rmsJobId: job.id,
    title: job.title,
    description: job.description,
    responsibilities: job.responsibilities ?? undefined,
    requirements: job.requirements ?? undefined,
    benefits: job.benefits ?? undefined,
    department: job.department.name,
    designation: job.designation.name,
    location: {
      name: job.location.name,
      city: job.location.city,
      state: job.location.state,
      country: job.location.country,
    },
    employmentType: job.employmentType?.name,
    experienceLevel: job.experienceLevel?.name,
    skills: job.skills.map((s) => s.skill.name),
    salaryMin: job.salaryMin != null ? Number(job.salaryMin) : undefined,
    salaryMax: job.salaryMax != null ? Number(job.salaryMax) : undefined,
    showSalary: job.showSalary,
    numberOfPositions: job.numberOfPositions,
    closingDate: job.closingDate ? job.closingDate.toISOString() : undefined,
    applicationUrl: `${careerBase}/careers/jobs`,
  };
}
