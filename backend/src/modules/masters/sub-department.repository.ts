import { prisma } from '../../config/database';
import { buildPagination } from '../../utils/response';
import type { MasterQueryDto } from './master.validators';

/**
 * SubDepartment repository with department relation and scoped uniqueness.
 */
export class SubDepartmentRepository {
  async findAll(query: MasterQueryDto, _searchFields: string[] = ['name']) {
    const { page, limit, search, isActive, sortBy, sortOrder, departmentId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) where['isActive'] = isActive;
    if (departmentId) where['departmentId'] = departmentId;

    const [data, total] = await Promise.all([
      prisma.subDepartment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { department: { select: { id: true, name: true } } },
      }),
      prisma.subDepartment.count({ where }),
    ]);

    return { data, pagination: buildPagination(total, page, limit) };
  }

  async findById(id: string) {
    return prisma.subDepartment.findFirst({
      where: { id, deletedAt: null },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async findByName(name: string, excludeId?: string, departmentId?: string) {
    return prisma.subDepartment.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
        ...(departmentId ? { departmentId } : {}),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async create(data: Record<string, unknown>) {
    return prisma.subDepartment.create({
      data: data as any,
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    return prisma.subDepartment.update({
      where: { id },
      data,
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async toggleActive(id: string, isActive: boolean) {
    return prisma.subDepartment.update({
      where: { id },
      data: { isActive },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.subDepartment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAllActive() {
    return prisma.subDepartment.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
      include: { department: { select: { id: true, name: true } } },
    });
  }
}
