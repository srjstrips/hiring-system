import { usersRepository } from './users.repository';
import { hashPassword, comparePassword, generateToken } from '../../utils/hash';
import { emailService } from '../../services/email.service';
import { NotFoundError, ConflictError, UnauthorizedError } from '../../utils/errors';
import { buildPagination } from '../../utils/response';
import type { CreateUserDto, UpdateUserDto, ChangePasswordDto, UserQueryDto } from './users.validators';

export class UsersService {
  async findAll(query: UserQueryDto) {
    const { data, total } = await usersRepository.findAll(query);
    const pagination = buildPagination(total, query.page, query.limit);
    return { data, pagination };
  }

  async findById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await usersRepository.emailExists(dto.email);
    if (exists) throw new ConflictError('A user with this email already exists');

    const tempPassword = dto.password || generateToken(12);
    const passwordHash = await hashPassword(tempPassword);

    const user = await usersRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      roleId: dto.roleId,
      departmentId: dto.departmentId,
      departmentIds: dto.departmentIds,
      locationIds: dto.locationIds,
    });

    if (!dto.password) {
      await emailService.sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`, tempPassword);
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError('User');

    const { departmentIds, locationIds, ...rest } = dto;
    return usersRepository.update(id, {
      ...rest,
      departmentIds,
      locationIds,
    } as any);
  }

  async delete(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    await usersRepository.softDelete(id);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError('User');

    const rawUser = await import('../../config/database').then(({ prisma }) =>
      prisma.user.findUnique({ where: { id: userId } })
    );

    if (!rawUser || !(await comparePassword(dto.currentPassword, rawUser.passwordHash))) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newHash = await hashPassword(dto.newPassword);
    await usersRepository.update(userId, { passwordHash: newHash });
  }

  async listRoles() {
    return usersRepository.listRoles();
  }
}

export const usersService = new UsersService();
