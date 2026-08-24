import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import { getUserScope, applyOfferScope } from '@/utils/scope';
import { assertForwardTransition } from '@/modules/applications/stage-order';

const offerInclude = {
  application: {
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      job: { select: { id: true, title: true, department: { select: { name: true } } } },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
};

function generateOfferNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `OFR-${year}-${rand}`;
}

class OffersService {
  async getAll(
    query: { page: number; limit: number; status?: string; departmentId?: string; search?: string },
    userId?: string,
    roleName?: string
  ) {
    const { page, limit, status, departmentId, search } = query;
    const skip = (page - 1) * limit;
    let where: any = {};
    if (status) where.status = status;
    if (departmentId) where.application = { job: { departmentId } };
    if (search) {
      where.OR = [
        { application: { candidate: { firstName: { contains: search, mode: 'insensitive' } } } },
        { application: { candidate: { lastName: { contains: search, mode: 'insensitive' } } } },
        { offerNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (userId && roleName) {
      const scope = await getUserScope(userId, roleName);
      where = applyOfferScope(where, scope);
    }

    const [data, total] = await Promise.all([
      prisma.offer.findMany({ where, skip, take: limit, include: offerInclude, orderBy: { createdAt: 'desc' } }),
      prisma.offer.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const offer = await prisma.offer.findUnique({ where: { id }, include: offerInclude });
    if (!offer) throw new AppError('Offer not found', 404);
    return offer;
  }

  async delete(id: string) {
    const offer = await this.getById(id);
    if (!['DRAFT', 'REJECTED', 'EXPIRED', 'WITHDRAWN'].includes(offer.status)) {
      throw new AppError('Only DRAFT, REJECTED, EXPIRED, or WITHDRAWN offers can be deleted', 400);
    }
    await prisma.offer.delete({ where: { id } });
  }

  async create(dto: any, createdById: string) {
    const app = await prisma.application.findUnique({ where: { id: dto.applicationId } });
    if (!app) throw new AppError('Application not found', 404);
    if (app.status !== 'SELECTED') throw new AppError('Candidate must be in SELECTED stage to create an offer', 400);

    const existing = await prisma.offer.findUnique({ where: { applicationId: dto.applicationId } });
    if (existing) throw new AppError('An offer already exists for this application', 409);

    return prisma.offer.create({
      data: {
        offerNumber: generateOfferNumber(),
        applicationId: dto.applicationId,
        ctc: dto.ctc,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        designation: dto.designation,
        department: dto.department,
        location: dto.location,
        salaryBreakdown: dto.salaryBreakdown,
        terms: dto.terms,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdById,
      },
      include: offerInclude,
    });
  }

  async update(id: string, dto: any) {
    const offer = await this.getById(id);
    if (!['DRAFT'].includes(offer.status)) throw new AppError('Only DRAFT offers can be edited', 400);
    return prisma.offer.update({ where: { id }, data: dto, include: offerInclude });
  }

  async send(id: string, sentById?: string) {
    const offer = await this.getById(id);
    if (offer.status !== 'DRAFT' && offer.status !== 'APPROVED') throw new AppError('Offer must be DRAFT or APPROVED to send', 400);

    const app = await prisma.application.findUniqueOrThrow({
      where: { id: offer.applicationId },
      include: { timeline: { orderBy: { createdAt: 'asc' }, select: { toStatus: true } } },
    });
    assertForwardTransition(app.status, 'OFFER_SENT', app.timeline);

    const updated = await prisma.offer.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      include: offerInclude,
    });
    // Also move application to OFFER_SENT
    await prisma.$transaction([
      prisma.application.update({ where: { id: offer.applicationId }, data: { status: 'OFFER_SENT' } }),
      prisma.applicationTimeline.create({
        data: {
          applicationId: offer.applicationId,
          fromStatus: app.status,
          toStatus: 'OFFER_SENT',
          notes: 'Offer sent to candidate',
          createdById: sentById,
        },
      }),
    ]);
    return updated;
  }

  async updateResponse(id: string, action: 'accept' | 'reject', reason?: string, respondedById?: string) {
    const offer = await this.getById(id);
    if (offer.status !== 'SENT') throw new AppError('Offer must be SENT to accept/reject', 400);

    const targetStatus = action === 'accept' ? 'OFFER_ACCEPTED' : 'REJECTED';
    const app = await prisma.application.findUniqueOrThrow({
      where: { id: offer.applicationId },
      include: { timeline: { orderBy: { createdAt: 'asc' }, select: { toStatus: true } } },
    });
    assertForwardTransition(app.status, targetStatus, app.timeline);

    const status = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
    const updated = await prisma.offer.update({
      where: { id },
      data: {
        status,
        acceptedAt: action === 'accept' ? new Date() : undefined,
        rejectedAt: action === 'reject' ? new Date() : undefined,
        rejectionReason: action === 'reject' ? reason : undefined,
      },
      include: offerInclude,
    });
    await prisma.$transaction([
      prisma.application.update({
        where: { id: offer.applicationId },
        data: { status: targetStatus, rejectionReason: action === 'reject' ? reason : undefined },
      }),
      prisma.applicationTimeline.create({
        data: {
          applicationId: offer.applicationId,
          fromStatus: app.status,
          toStatus: targetStatus,
          notes: action === 'accept' ? 'Candidate accepted the offer' : (reason || 'Candidate rejected the offer'),
          createdById: respondedById,
        },
      }),
    ]);

    if (action === 'accept') {
      const acceptedApp = await prisma.application.findUnique({
        where: { id: offer.applicationId },
        include: { job: true, candidate: true },
      });
      if (acceptedApp) {
        await prisma.joiningChecklist.upsert({
          where: { applicationId: acceptedApp.id },
          create: {
            applicationId: acceptedApp.id,
            joiningDate: offer.joiningDate ?? undefined,
            status: 'PENDING',
          },
          update: { joiningDate: offer.joiningDate ?? undefined },
        });
        await prisma.employee.upsert({
          where: { applicationId: acceptedApp.id },
          create: {
            applicationId: acceptedApp.id,
            candidateId: acceptedApp.candidateId,
            departmentId: acceptedApp.job.departmentId,
            designationId: acceptedApp.job.designationId,
            hrOwnerId: offer.createdById,
            joinedAt: offer.joiningDate ?? new Date(),
            status: 'ACTIVE',
          },
          update: {},
        });
      }
    }

    return updated;
  }

  async getSummary(query: any = {}, userId?: string, roleName?: string) {
    let where: any = {};
    if (query.departmentId) {
      where.application = { job: { departmentId: query.departmentId } };
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }
    if (userId && roleName) {
      const scope = await getUserScope(userId, roleName);
      where = applyOfferScope(where, scope);
    }
    const grouped = await prisma.offer.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    const summary: Record<string, number> = {};
    for (const g of grouped) summary[g.status] = g._count._all;
    summary.pendingResponse = summary.SENT ?? 0;
    summary.sent = summary.SENT ?? 0;
    return summary;
  }
}

export default new OffersService();
