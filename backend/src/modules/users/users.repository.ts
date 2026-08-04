import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import type { UserQueryDto } from './users.validators';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  status: true,
  departmentId: true,
  lastLoginAt: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: { id: true, name: true, displayName: true },
  },
  department: {
    select: { id: true, name: true },
  },
} satisfies Prisma.UserSelect;

export class UsersRepository {
  async findAll(query: UserQueryDto) {
    const { page, limit, search, roleId, status, departmentId, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(roleId && { roleId }),
      ...(status && { status }),
      ...(departmentId && { departmentId }),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: userSelect,
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleId: string;
    departmentId?: string;
  }) {
    return prisma.user.create({
      data: { ...data, email: data.email.toLowerCase() },
      select: userSelect,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async emailExists(email: string, excludeId?: string) {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!user;
  }
}

export const usersRepository = new UsersRepository();
