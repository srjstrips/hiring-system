import { v4 as uuidv4 } from 'uuid';
import { authRepository } from './auth.repository';
import { comparePassword, hashPassword, generateToken } from '../../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { emailService } from '../../services/email.service';
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from '../../utils/errors';
import type { LoginDto, ForgotPasswordDto, ResetPasswordDto } from './auth.validators';

export class AuthService {
  private extractPermissions(user: Awaited<ReturnType<typeof authRepository.findUserByEmail>>): string[] {
    if (!user?.role?.rolePermissions) return [];
    return user.role.rolePermissions
      .filter((rp) => rp.permission.isActive)
      .map((rp) => `${rp.permission.resource}:${rp.permission.action}`);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await authRepository.findUserByEmail(dto.email);

    if (!user || !(await comparePassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Your account has been suspended. Contact support.');
    }

    const permissions = this.extractPermissions(user);

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions,
    });

    const refreshTokenId = uuidv4();
    const refreshToken = signRefreshToken({ sub: user.id, tokenId: refreshTokenId });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await authRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await authRepository.updateLastLogin(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        roleName: user.role.displayName,
        permissions,
        avatar: user.avatar,
      },
    };
  }

  async refresh(token: string) {
    const payload = verifyRefreshToken(token);

    const storedToken = await authRepository.findRefreshToken(token);

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await authRepository.findUserById(payload.sub);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User not found or inactive');
    }

    const permissions = this.extractPermissions(user);

    // Rotate: revoke old, issue new
    await authRepository.revokeRefreshToken(token);

    const newAccessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions,
    });

    const newRefreshTokenId = uuidv4();
    const newRefreshToken = signRefreshToken({ sub: user.id, tokenId: newRefreshTokenId });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await authRepository.createRefreshToken({
      userId: user.id,
      token: newRefreshToken,
      expiresAt,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    await authRepository.revokeRefreshToken(refreshToken).catch(() => null);
  }

  async logoutAll(userId: string) {
    await authRepository.revokeAllUserRefreshTokens(userId);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await authRepository.findUserByEmail(dto.email);

    // Always return success to prevent email enumeration
    if (!user) return;

    const token = generateToken(64);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await authRepository.createPasswordReset({
      userId: user.id,
      token,
      expiresAt,
    });

    await emailService.sendPasswordResetEmail(
      user.email,
      token,
      `${user.firstName} ${user.lastName}`
    );
  }

  async resetPassword(dto: ResetPasswordDto) {
    const reset = await authRepository.findPasswordReset(dto.token);

    if (!reset) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    if (reset.usedAt !== null) {
      throw new BadRequestError('This reset link has already been used');
    }

    if (reset.expiresAt < new Date()) {
      throw new BadRequestError('Reset token has expired. Please request a new one.');
    }

    const passwordHash = await hashPassword(dto.password);

    await authRepository.updateUserPassword(reset.userId, passwordHash);
    await authRepository.markPasswordResetUsed(reset.id);
    await authRepository.revokeAllUserRefreshTokens(reset.userId);
  }

  async getMe(userId: string) {
    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundError('User');
    }

    const permissions = this.extractPermissions(user);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
      role: user.role.name,
      roleName: user.role.displayName,
      permissions,
      departmentId: user.departmentId,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
