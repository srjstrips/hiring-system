import * as XLSX from 'xlsx';
import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import type { CandidateQueryDto } from './candidates.validator';

const candidateInclude = {
  source: { select: { id: true, name: true } },
  skills: { include: { skill: { select: { id: true, name: true } } } },
  educations: { include: { education: { select: { id: true, name: true } } } },
  experiences: { orderBy: { startDate: 'desc' as const } },
  certificates: { orderBy: { createdAt: 'desc' as const } },
  applications: {
    orderBy: { appliedAt: 'desc' as const },
    include: {
      job: { select: { id: true, title: true } },
      assessmentAttempts: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: 'desc' as const },
        take: 1,
        select: { score: true, isPassed: true },
      },
    },
  },
  _count: { select: { applications: true } },
};

function mapCandidate(row: any) {
  if (!row) return row;
  return {
    ...row,
    applications: (row.applications ?? []).map((app: any) => {
      const { assessmentAttempts, ...rest } = app;
      return { ...rest, assessmentAttempt: assessmentAttempts?.[0] ?? null };
    }),
  };
}

function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

class CandidatesService {
  async getAll(query: CandidateQueryDto) {
    const {
      page,
      limit,
      search,
      experienceMin,
      experienceMax,
      noticeMin,
      noticeMax,
      salaryMin,
      salaryMax,
      designation,
      applicationFrom,
      applicationTo,
      pastCompany,
      skills,
      skillMatchMode,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { currentCompany: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (experienceMin != null || experienceMax != null) {
      where.totalExperience = {
        ...(experienceMin != null ? { gte: experienceMin } : {}),
        ...(experienceMax != null ? { lte: experienceMax } : {}),
      };
    }

    if (noticeMin != null || noticeMax != null) {
      where.noticePeriodDays = {
        ...(noticeMin != null ? { gte: noticeMin } : {}),
        ...(noticeMax != null ? { lte: noticeMax } : {}),
      };
    }

    if (salaryMin != null || salaryMax != null) {
      where.expectedSalary = {
        ...(salaryMin != null ? { gte: salaryMin } : {}),
        ...(salaryMax != null ? { lte: salaryMax } : {}),
      };
    }

    if (designation) {
      where.currentDesignation = { contains: designation, mode: 'insensitive' };
    }

    if (pastCompany) {
      andConditions.push({
        OR: [
          { currentCompany: { contains: pastCompany, mode: 'insensitive' } },
          { experiences: { some: { company: { contains: pastCompany, mode: 'insensitive' } } } },
        ],
      });
    }

    if (applicationFrom || applicationTo) {
      where.applications = {
        some: {
          appliedAt: {
            ...(applicationFrom ? { gte: startOfDay(applicationFrom) } : {}),
            ...(applicationTo ? { lte: endOfDay(applicationTo) } : {}),
          },
        },
      };
    }

    if (skills?.length) {
      if (skillMatchMode === 'ANY') {
        where.skills = { some: { skillId: { in: skills } } };
      } else {
        andConditions.push(
          ...skills.map((skillId) => ({
            skills: { some: { skillId } },
          })),
        );
      }
    }

    if (andConditions.length) {
      where.AND = andConditions;
    }

    const [data, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          source: { select: { id: true, name: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.candidate.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async getById(id: string) {
    const c = await prisma.candidate.findUnique({ where: { id }, include: candidateInclude });
    if (!c) throw new AppError('Candidate not found', 404);
    return mapCandidate(c);
  }

  async exportExcel(query: CandidateQueryDto): Promise<Buffer> {
    // Reuse same where-building logic but fetch all rows (no pagination)
    const {
      search, experienceMin, experienceMax, noticeMin, noticeMax,
      salaryMin, salaryMax, designation, applicationFrom, applicationTo,
      pastCompany, skills, skillMatchMode,
    } = query;

    const where: any = { deletedAt: null };
    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { currentCompany: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (experienceMin != null || experienceMax != null) {
      where.totalExperience = {
        ...(experienceMin != null ? { gte: experienceMin } : {}),
        ...(experienceMax != null ? { lte: experienceMax } : {}),
      };
    }
    if (noticeMin != null || noticeMax != null) {
      where.noticePeriodDays = {
        ...(noticeMin != null ? { gte: noticeMin } : {}),
        ...(noticeMax != null ? { lte: noticeMax } : {}),
      };
    }
    if (salaryMin != null || salaryMax != null) {
      where.expectedSalary = {
        ...(salaryMin != null ? { gte: salaryMin } : {}),
        ...(salaryMax != null ? { lte: salaryMax } : {}),
      };
    }
    if (designation) {
      where.currentDesignation = { contains: designation, mode: 'insensitive' };
    }
    if (pastCompany) {
      andConditions.push({
        OR: [
          { currentCompany: { contains: pastCompany, mode: 'insensitive' } },
          { experiences: { some: { company: { contains: pastCompany, mode: 'insensitive' } } } },
        ],
      });
    }
    if (applicationFrom || applicationTo) {
      where.applications = {
        some: {
          appliedAt: {
            ...(applicationFrom ? { gte: startOfDay(applicationFrom) } : {}),
            ...(applicationTo ? { lte: endOfDay(applicationTo) } : {}),
          },
        },
      };
    }
    if (skills?.length) {
      if (skillMatchMode === 'ANY') {
        where.skills = { some: { skillId: { in: skills } } };
      } else {
        andConditions.push(...skills.map((skillId) => ({ skills: { some: { skillId } } })));
      }
    }
    if (andConditions.length) where.AND = andConditions;

    const rows = await prisma.candidate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        source: { select: { name: true } },
        skills: { include: { skill: { select: { name: true } } } },
        _count: { select: { applications: true } },
      },
    });

    const sheetData = rows.map((c: any) => ({
      'First Name': c.firstName,
      'Last Name': c.lastName,
      'Email': c.email,
      'Phone': c.phone ?? '',
      'Current Company': c.currentCompany ?? '',
      'Current Designation': c.currentDesignation ?? '',
      'Total Experience (yrs)': c.totalExperience ?? '',
      'Notice Period (days)': c.noticePeriodDays ?? '',
      'Expected Salary (₹)': c.expectedSalary ?? '',
      'Current Salary (₹)': c.currentSalary ?? '',
      'Skills': (c.skills ?? []).map((s: any) => s.skill.name).join(', '),
      'Source': c.source?.name ?? '',
      'LinkedIn': c.linkedinUrl ?? '',
      'Applications': c._count.applications,
      'Location': c.currentLocation ?? '',
      'Date Added': c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);

    // Auto column widths
    const colWidths = Object.keys(sheetData[0] ?? {}).map((key) => ({
      wch: Math.max(key.length, ...sheetData.map((r: any) => String(r[key] ?? '').length), 10),
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}

export default new CandidatesService();
