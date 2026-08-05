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
  departmentAssignments: {
    select: {
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  },
  locationAssignments: {
    select: {
      locationId: true,
      location: { select: { id: true, name: true } },
    },
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
      ...(departmentId && {
        OR: [
          { departmentId },
          { departmentAssignments: { some: { departmentId } } },
        ],
      }),
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
    departmentIds?: string[];
    locationIds?: string[];
  }) {
    const { departmentIds = [], locationIds = [], ...userData } = data;
    return prisma.user.create({
      data: {
        ...userData,
        email: userData.email.toLowerCase(),
        departmentAssignments: departmentIds.length
          ? { create: departmentIds.map((departmentId) => ({ departmentId })) }
          : undefined,
        locationAssignments: locationIds.length
          ? { create: locationIds.map((locationId) => ({ locationId })) }
          : undefined,
      },
      select: userSelect,
    });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput & { departmentIds?: string[]; locationIds?: string[] }
  ) {
    const { departmentIds, locationIds, ...rest } = data as any;

    return prisma.$transaction(async (tx) => {
      if (departmentIds) {
        await tx.userDepartment.deleteMany({ where: { userId: id } });
        if (departmentIds.length) {
          await tx.userDepartment.createMany({
            data: departmentIds.map((departmentId: string) => ({ userId: id, departmentId })),
          });
        }
      }
      if (locationIds) {
        await tx.userLocation.deleteMany({ where: { userId: id } });
        if (locationIds.length) {
          await tx.userLocation.createMany({
            data: locationIds.map((locationId: string) => ({ userId: id, locationId })),
          });
        }
      }
      return tx.user.update({
        where: { id },
        data: rest,
        select: userSelect,
      });
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

  async listRoles() {
    return prisma.role.findMany({
      where: { isActive: true },
      select: { id: true, name: true, displayName: true, description: true },
      orderBy: { displayName: 'asc' },
    });
  }
}

export const usersRepository = new UsersRepository();
