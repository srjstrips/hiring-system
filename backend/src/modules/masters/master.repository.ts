import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { buildPagination } from '../../utils/response';
import type { MasterQueryDto } from './master.validators';

/**
 * Generic repository for simple master data tables.
 * T = the return type of a single record.
 * All master tables share: id, name, isActive, createdAt, updatedAt, deletedAt
 */
export class MasterRepository<T extends { id: string }> {
  // The Prisma delegate is typed as any here because Prisma doesn't expose
  // a common interface across all model delegates.
  private delegate: any;

  constructor(modelName: Prisma.ModelName) {
    this.delegate = (prisma as any)[
      modelName.charAt(0).toLowerCase() + modelName.slice(1)
    ];
  }

  async findAll(query: MasterQueryDto, searchFields: string[] = ['name']) {
    const { page, limit, search, isActive, sortBy, sortOrder, departmentId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where['OR'] = searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }

    if (isActive !== undefined) {
      where['isActive'] = isActive;
    }

    if (departmentId) {
      where['departmentId'] = departmentId;
    }

    const [data, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.delegate.count({ where }),
    ]);

    return { data: data as T[], pagination: buildPagination(total, page, limit) };
  }

  async findById(id: string): Promise<T | null> {
    return this.delegate.findFirst({ where: { id, deletedAt: null } });
  }

  async findByName(name: string, excludeId?: string, departmentId?: string): Promise<T | null> {
    return this.delegate.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
        ...(departmentId && { departmentId }),
      },
    });
  }

  async create(data: Record<string, unknown>): Promise<T> {
    return this.delegate.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<T> {
    return this.delegate.update({ where: { id }, data });
  }

  async toggleActive(id: string, isActive: boolean): Promise<T> {
    return this.delegate.update({ where: { id }, data: { isActive } });
  }

  async softDelete(id: string): Promise<void> {
    await this.delegate.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async findAllActive(): Promise<T[]> {
    return this.delegate.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }
}
