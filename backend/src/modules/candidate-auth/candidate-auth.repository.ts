import { prisma } from '../../config/database';

export class CandidateAuthRepository {
  async findByEmail(email: string) {
    return prisma.candidate.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async findById(id: string) {
    return prisma.candidate.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async createWithPassword(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    passwordHash: string;
  }) {
    return prisma.candidate.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        passwordHash: data.passwordHash,
      },
    });
  }

  async attachPasswordToExisting(candidateId: string, passwordHash: string) {
    return prisma.candidate.update({
      where: { id: candidateId },
      data: { passwordHash },
    });
  }

  async updateLastLogin(candidateId: string) {
    return prisma.candidate.update({
      where: { id: candidateId },
      data: { lastLoginAt: new Date() },
    });
  }

  async updateProfile(candidateId: string, data: Record<string, unknown>) {
    return prisma.candidate.update({
      where: { id: candidateId },
      data,
    });
  }

  async listCertifications(candidateId: string) {
    return prisma.candidateCertification.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCertification(data: {
    candidateId: string;
    name: string;
    fileUrl?: string;
    fileOriginalName?: string;
  }) {
    return prisma.candidateCertification.create({ data });
  }

  async findCertification(id: string) {
    return prisma.candidateCertification.findUnique({ where: { id } });
  }

  async deleteCertification(id: string) {
    return prisma.candidateCertification.delete({ where: { id } });
  }

  async createRefreshToken(data: {
    candidateId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.candidateRefreshToken.create({ data });
  }

  async findRefreshToken(token: string) {
    return prisma.candidateRefreshToken.findUnique({
      where: { token },
      include: { candidate: true },
    });
  }

  async revokeRefreshToken(token: string) {
    return prisma.candidateRefreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });
  }

  async revokeAllCandidateRefreshTokens(candidateId: string) {
    return prisma.candidateRefreshToken.updateMany({
      where: { candidateId, isRevoked: false },
      data: { isRevoked: true },
    });
  }
}

export const candidateAuthRepository = new CandidateAuthRepository();
