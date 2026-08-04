import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';

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
  async getAll(query: { page: number; limit: number; status?: string; search?: string }) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { application: { candidate: { firstName: { contains: search, mode: 'insensitive' } } } },
        { application: { candidate: { lastName: { contains: search, mode: 'insensitive' } } } },
        { offerNumber: { contains: search, mode: 'insensitive' } },
      ];
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
        joiningBonus: dto.joiningBonus,
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

  async send(id: string) {
    const offer = await this.getById(id);
    if (offer.status !== 'DRAFT' && offer.status !== 'APPROVED') throw new AppError('Offer must be DRAFT or APPROVED to send', 400);
    const updated = await prisma.offer.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      include: offerInclude,
    });
    // Also move application to OFFER_SENT
    await prisma.application.update({ where: { id: offer.applicationId }, data: { status: 'OFFER_SENT' } });
    return updated;
  }

  async updateResponse(id: string, action: 'accept' | 'reject', reason?: string) {
    const offer = await this.getById(id);
    if (offer.status !== 'SENT') throw new AppError('Offer must be SENT to accept/reject', 400);
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
    await prisma.application.update({
      where: { id: offer.applicationId },
      data: { status: action === 'accept' ? 'OFFER_ACCEPTED' : 'REJECTED' },
    });
    return updated;
  }
}

export default new OffersService();
