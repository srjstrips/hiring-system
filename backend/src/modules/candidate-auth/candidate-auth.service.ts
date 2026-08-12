import { v4 as uuidv4 } from 'uuid';
import { candidateAuthRepository } from './candidate-auth.repository';
import { comparePassword, hashPassword } from '../../utils/hash';
import {
  signCandidateAccessToken,
  signCandidateRefreshToken,
  verifyCandidateRefreshToken,
} from '../../utils/jwt';
import { UnauthorizedError, NotFoundError, ConflictError } from '../../utils/errors';
import type { LoginDto, SignupDto } from './candidate-auth.validators';

export class CandidateAuthService {
  private buildAuthPayload(candidate: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const accessToken = signCandidateAccessToken({
      sub: candidate.id,
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
    });

    const refreshTokenId = uuidv4();
    const refreshToken = signCandidateRefreshToken({ sub: candidate.id, tokenId: refreshTokenId });

    return { accessToken, refreshToken };
  }

  async signup(dto: SignupDto, ipAddress?: string, userAgent?: string) {
    const existing = await candidateAuthRepository.findByEmail(dto.email);

    const passwordHash = await hashPassword(dto.password);

    let candidate;
    if (!existing) {
      candidate = await candidateAuthRepository.createWithPassword({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
      });
    } else if (!existing.passwordHash) {
      candidate = await candidateAuthRepository.attachPasswordToExisting(existing.id, passwordHash);
    } else {
      throw new ConflictError('An account with this email already exists. Please log in.');
    }

    const { accessToken, refreshToken } = this.buildAuthPayload(candidate);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await candidateAuthRepository.createRefreshToken({
      candidateId: candidate.id,
      token: refreshToken,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await candidateAuthRepository.updateLastLogin(candidate.id);

    return {
      accessToken,
      refreshToken,
      candidate: {
        id: candidate.id,
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        phone: candidate.phone,
      },
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const candidate = await candidateAuthRepository.findByEmail(dto.email);

    if (!candidate || !candidate.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!(await comparePassword(dto.password, candidate.passwordHash))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!candidate.isActive) {
      throw new UnauthorizedError('Your account has been suspended. Contact support.');
    }

    const { accessToken, refreshToken } = this.buildAuthPayload(candidate);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await candidateAuthRepository.createRefreshToken({
      candidateId: candidate.id,
      token: refreshToken,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await candidateAuthRepository.updateLastLogin(candidate.id);

    return {
      accessToken,
      refreshToken,
      candidate: {
        id: candidate.id,
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        phone: candidate.phone,
      },
    };
  }

  async refresh(token: string) {
    const payload = verifyCandidateRefreshToken(token);

    const storedToken = await candidateAuthRepository.findRefreshToken(token);

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const candidate = await candidateAuthRepository.findById(payload.sub);

    if (!candidate || !candidate.isActive) {
      throw new UnauthorizedError('Candidate not found or inactive');
    }

    // Rotate: revoke old, issue new
    await candidateAuthRepository.revokeRefreshToken(token);

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = this.buildAuthPayload(candidate);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await candidateAuthRepository.createRefreshToken({
      candidateId: candidate.id,
      token: newRefreshToken,
      expiresAt,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    await candidateAuthRepository.revokeRefreshToken(refreshToken).catch(() => null);
  }

  async getMe(candidateId: string) {
    const candidate = await candidateAuthRepository.findById(candidateId);

    if (!candidate) {
      throw new NotFoundError('Candidate');
    }

    return {
      id: candidate.id,
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      phone: candidate.phone,
      resumeUrl: candidate.resumeUrl,
      lastLoginAt: candidate.lastLoginAt,
      createdAt: candidate.createdAt,
    };
  }
}

export const candidateAuthService = new CandidateAuthService();
