import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import { getUserScope } from '@/utils/scope';

const employeeInclude = {
  candidate: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  hrOwner: { select: { id: true, firstName: true, lastName: true } },
  application: { select: { id: true, jobId: true } },
};

class EmployeesService {
  async getAll(
    query: {
      page: number;
      limit: number;
      status?: string;
      noticeStatus?: string;
      departmentId?: string;
      search?: string;
    },
    userId?: string,
    roleName?: string
  ) {
    const { page, limit, status, noticeStatus, departmentId, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (noticeStatus) where.noticeStatus = noticeStatus;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (userId && roleName) {
      const scope = await getUserScope(userId, roleName);
      if (!scope.isSuperAdmin && !where.departmentId) {
        where.departmentId = { in: scope.departmentIds?.length ? scope.departmentIds : ['__none__'] };
      }
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: employeeInclude,
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.employee.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const employee = await prisma.employee.findUnique({ where: { id }, include: employeeInclude });
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
  }

  async createFromOffer(offerId: string) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { application: { include: { job: true, candidate: true } } },
    });
    if (!offer) throw new AppError('Offer not found', 404);
    if (offer.status !== 'ACCEPTED') {
      throw new AppError('Offer must be ACCEPTED to create an employee record', 400);
    }

    const app = offer.application;

    const employee = await prisma.employee.upsert({
      where: { applicationId: app.id },
      create: {
        applicationId: app.id,
        candidateId: app.candidateId,
        departmentId: app.job.departmentId,
        designationId: app.job.designationId,
        hrOwnerId: offer.createdById,
        joinedAt: offer.joiningDate ?? new Date(),
        status: 'ACTIVE',
      },
      update: {},
      include: employeeInclude,
    });

    await prisma.joiningChecklist.upsert({
      where: { applicationId: app.id },
      create: {
        applicationId: app.id,
        joiningDate: offer.joiningDate ?? undefined,
        status: 'PENDING',
      },
      update: {},
    });

    return employee;
  }

  async updateStatus(
    id: string,
    dto: {
      status?: string;
      noticeStartDate?: string;
      noticeEndDate?: string;
      noticeStatus?: string;
      exitReason?: string;
      exitedAt?: string;
    }
  ) {
    await this.getById(id);
    return prisma.employee.update({
      where: { id },
      data: {
        status: dto.status as any,
        noticeStartDate: dto.noticeStartDate ? new Date(dto.noticeStartDate) : undefined,
        noticeEndDate: dto.noticeEndDate ? new Date(dto.noticeEndDate) : undefined,
        noticeStatus: dto.noticeStatus as any,
        exitReason: dto.exitReason,
        exitedAt: dto.exitedAt ? new Date(dto.exitedAt) : undefined,
      },
      include: employeeInclude,
    });
  }
}

export default new EmployeesService();
