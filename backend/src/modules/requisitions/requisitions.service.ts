import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import { getUserScope, applyRequisitionScope } from '@/utils/scope';
import jobsService from '@/modules/jobs/jobs.service';

const requisitionInclude = {
  department: { select: { id: true, name: true } },
  subDepartment: { select: { id: true, name: true } },
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

function parseReplacementAvailable(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toUpperCase();
    return v === 'YES' || v === 'TRUE' || v === '1';
  }
  return false;
}

function mapRequisitionFields(dto: any) {
  const replacementAvailable = parseReplacementAvailable(dto.replacementAvailable);
  return {
    departmentId: dto.departmentId,
    subDepartmentId: dto.subDepartmentId || null,
    designationId: dto.designationId,
    locationId: dto.locationId,
    experienceLevelId: dto.experienceLevelId || null,
    numberOfPositions: dto.numberOfPositions,
    salaryMin: dto.salaryMin ?? null,
    salaryMax: dto.salaryMax ?? null,
    jobDescription: dto.jobDescription || null,
    remark: dto.remark || null,
    priority: dto.priority ?? 'MEDIUM',
    hiringManagerId: dto.hiringManagerId || null,
    targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
    replacementAvailable,
    replacementEmployeeName: replacementAvailable
      ? (dto.replacementEmployeeName || null)
      : null,
    hodName: dto.hodName || null,
    raisedFrom: dto.raisedFrom || null,
  };
}

class RequisitionsService {
  async getAll(query: {
    page: number;
    limit: number;
    status?: string;
    approvalStatus?: string;
    departmentId?: string;
    locationId?: string;
    priority?: string;
    search?: string;
  }, userId?: string, roleName?: string) {
    const { page, limit, status, approvalStatus, departmentId, locationId, priority, search } = query;
    const skip = (page - 1) * limit;
    let where: any = { deletedAt: null };
    const statusFilter = approvalStatus || status;
    if (statusFilter) where.approvalStatus = statusFilter;
    if (departmentId) where.departmentId = departmentId;
    if (locationId) where.locationId = locationId;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { requisitionNumber: { contains: search, mode: 'insensitive' } },
        { designation: { name: { contains: search, mode: 'insensitive' } } },
        { department: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (userId && roleName) {
      const scope = await getUserScope(userId, roleName);
      where = applyRequisitionScope(where, scope);
    }

    const [data, total] = await Promise.all([
      prisma.manpowerRequisition.findMany({ where, skip, take: limit, include: requisitionInclude, orderBy: { createdAt: 'desc' } }),
      prisma.manpowerRequisition.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSummary() {
    const grouped = await prisma.manpowerRequisition.groupBy({
      by: ['approvalStatus'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const summary: Record<string, number> = {};
    for (const g of grouped) summary[g.approvalStatus] = g._count._all;
    return summary;
  }

  async getById(id: string) {
    const r = await prisma.manpowerRequisition.findUnique({ where: { id }, include: requisitionInclude });
    if (!r) throw new AppError('Requisition not found', 404);
    return r;
  }

  async create(dto: any, createdById: string) {
    const fields = mapRequisitionFields(dto);
    return prisma.manpowerRequisition.create({
      data: {
        requisitionNumber: generateRequisitionNumber(),
        ...fields,
        approvalStatus: dto.isDraft ? 'DRAFT' : 'PENDING',
        createdById,
        skills: dto.skillIds
          ? { create: dto.skillIds.map((s: any) => ({ skillId: s.skillId, isRequired: s.isRequired ?? true })) }
          : undefined,
      },
      include: requisitionInclude,
    });
  }

  async update(id: string, dto: any) {
    const r = await this.getById(id);
    if (!['DRAFT', 'ON_HOLD', 'PENDING'].includes(r.approvalStatus)) {
      throw new AppError('Only DRAFT, PENDING, or ON_HOLD requisitions can be edited', 400);
    }
    const { skillIds, ...rest } = dto;
    const fields = mapRequisitionFields({ ...r, ...rest });
    if (skillIds !== undefined) {
      await prisma.requisitionSkill.deleteMany({ where: { requisitionId: id } });
    }
    return prisma.manpowerRequisition.update({
      where: { id },
      data: {
        ...fields,
        skills: skillIds?.length
          ? { create: skillIds.map((s: any) => ({ skillId: s.skillId, isRequired: s.isRequired ?? true })) }
          : undefined,
      },
      include: requisitionInclude,
    });
  }

  async submitForApproval(id: string) {
    const r = await this.getById(id);
    if (r.approvalStatus !== 'DRAFT') throw new AppError('Only DRAFT requisitions can be submitted', 400);
    return prisma.manpowerRequisition.update({
      where: { id },
      data: { approvalStatus: 'PENDING' },
      include: requisitionInclude,
    });
  }

  async close(id: string, reason?: string) {
    const r = await this.getById(id);
    if (['REJECTED', 'CLOSED'].includes(r.approvalStatus)) {
      throw new AppError('Requisition is already closed or rejected', 400);
    }
    return prisma.manpowerRequisition.update({
      where: { id },
      data: { approvalStatus: 'CLOSED', isActive: false, rejectionReason: reason },
      include: requisitionInclude,
    });
  }

  async approve(id: string, approverId: string, action: 'approve' | 'reject', reason?: string) {
    const r = await this.getById(id);
    if (r.approvalStatus !== 'PENDING') throw new AppError('Only PENDING requisitions can be reviewed', 400);
    const updated = await prisma.manpowerRequisition.update({
      where: { id },
      data: {
        approvalStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
        approvedById: action === 'approve' ? approverId : undefined,
        approvedAt: action === 'approve' ? new Date() : undefined,
        rejectionReason: action === 'reject' ? reason : undefined,
      },
      include: requisitionInclude,
    });

    if (action === 'approve') {
      await jobsService.createFromRequisition(updated, approverId);
    }

    return updated;
  }
}

export default new RequisitionsService();
