import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';

const requisitionInclude = {
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
  experienceLevel: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  skills: { include: { skill: { select: { id: true, name: true } } } },
  _count: { select: { jobs: true } },
};

function generateRequisitionNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `MR-${year}-${rand}`;
}

class RequisitionsService {
  async getAll(query: { page: number; limit: number; status?: string; departmentId?: string; search?: string }) {
    const { page, limit, status, departmentId, search } = query;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (status) where.approvalStatus = status;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { requisitionNumber: { contains: search, mode: 'insensitive' } },
        { designation: { name: { contains: search, mode: 'insensitive' } } },
        { department: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.manpowerRequisition.findMany({ where, skip, take: limit, include: requisitionInclude, orderBy: { createdAt: 'desc' } }),
      prisma.manpowerRequisition.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const r = await prisma.manpowerRequisition.findUnique({ where: { id }, include: requisitionInclude });
    if (!r) throw new AppError('Requisition not found', 404);
    return r;
  }

  async create(dto: any, createdById: string) {
    return prisma.manpowerRequisition.create({
      data: {
        requisitionNumber: generateRequisitionNumber(),
        departmentId: dto.departmentId,
        designationId: dto.designationId,
        locationId: dto.locationId,
        experienceLevelId: dto.experienceLevelId,
        numberOfPositions: dto.numberOfPositions,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        jobDescription: dto.jobDescription,
        priority: dto.priority ?? 'MEDIUM',
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        createdById,
        skills: dto.skillIds
          ? { create: dto.skillIds.map((s: any) => ({ skillId: s.skillId, isRequired: s.isRequired ?? true })) }
          : undefined,
      },
      include: requisitionInclude,
    });
  }

  async approve(id: string, approverId: string, action: 'approve' | 'reject', reason?: string) {
    const r = await this.getById(id);
    if (r.approvalStatus !== 'PENDING') throw new AppError('Only PENDING requisitions can be reviewed', 400);
    return prisma.manpowerRequisition.update({
      where: { id },
      data: {
        approvalStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
        approvedById: action === 'approve' ? approverId : undefined,
        approvedAt: action === 'approve' ? new Date() : undefined,
        rejectionReason: action === 'reject' ? reason : undefined,
      },
      include: requisitionInclude,
    });
  }
}

export default new RequisitionsService();
