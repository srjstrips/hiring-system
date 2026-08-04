import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';

const candidateInclude = {
  source: { select: { id: true, name: true } },
  skills: { include: { skill: { select: { id: true, name: true } } } },
  educations: { include: { education: { select: { id: true, name: true } } } },
  experiences: { orderBy: { startDate: 'desc' as const } },
  applications: {
    orderBy: { appliedAt: 'desc' as const },
    include: {
      job: { select: { id: true, title: true } },
      assessmentAttempt: { select: { score: true, isPassed: true } },
    },
  },
  _count: { select: { applications: true } },
};

class CandidatesService {
  async getAll(query: { page: number; limit: number; search?: string; status?: string }) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { currentCompany: { contains: search, mode: 'insensitive' } },
      ];
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

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const c = await prisma.candidate.findUnique({ where: { id }, include: candidateInclude });
    if (!c) throw new AppError('Candidate not found', 404);
    return c;
  }
}

export default new CandidatesService();
