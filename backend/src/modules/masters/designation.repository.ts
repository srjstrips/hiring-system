import { prisma } from '../../config/database';
import { MasterRepository } from './master.repository';
import { buildPagination } from '../../utils/response';
import type { MasterQueryDto } from './master.validators';

const skillInclude = {
  skills: {
    include: {
      skill: { select: { id: true, name: true } },
    },
  },
};

type SkillInput = { skillId: string; isRequired?: boolean };

export class DesignationRepository extends MasterRepository<any> {
  constructor() {
    super('Designation');
  }

  async findAll(query: MasterQueryDto, searchFields: string[] = ['name', 'code']) {
    const { page, limit, search, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where['OR'] = searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }
    if (isActive !== undefined) where['isActive'] = isActive;

    const [data, total] = await Promise.all([
      prisma.designation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: skillInclude,
      }),
      prisma.designation.count({ where }),
    ]);

    return { data, pagination: buildPagination(total, page, limit) };
  }

  async findById(id: string) {
    return prisma.designation.findFirst({
      where: { id, deletedAt: null },
      include: skillInclude,
    });
  }

  async findAllActive() {
    return prisma.designation.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
      include: skillInclude,
    });
  }

  async create(data: Record<string, unknown>) {
    const skillIds = (data['skillIds'] as SkillInput[] | undefined) ?? [];
    const {
      skillIds: _ignored,
      name,
      code,
      description,
      level,
      defaultDescription,
      defaultResponsibilities,
      defaultRequirements,
      defaultBenefits,
      isActive,
    } = data as Record<string, unknown>;

    return prisma.designation.create({
      data: {
        name: name as string,
        code: code as string,
        description: (description as string | undefined) || undefined,
        level: level == null || level === '' ? undefined : Number(level),
        defaultDescription: (defaultDescription as string | undefined) || undefined,
        defaultResponsibilities: (defaultResponsibilities as string | undefined) || undefined,
        defaultRequirements: (defaultRequirements as string | undefined) || undefined,
        defaultBenefits: (defaultBenefits as string | undefined) || undefined,
        isActive: isActive === undefined ? true : Boolean(isActive),
        skills: skillIds.length
          ? {
              create: skillIds.map((s) => ({
                skillId: s.skillId,
                isRequired: s.isRequired ?? true,
              })),
            }
          : undefined,
      },
      include: skillInclude,
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    const hasSkills = Object.prototype.hasOwnProperty.call(data, 'skillIds');
    const skillIds = (data['skillIds'] as SkillInput[] | undefined) ?? [];

    const payload: Record<string, unknown> = {};
    for (const key of [
      'name',
      'code',
      'description',
      'level',
      'defaultDescription',
      'defaultResponsibilities',
      'defaultRequirements',
      'defaultBenefits',
      'isActive',
    ] as const) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (key === 'level') {
          payload[key] = value == null || value === '' ? null : Number(value);
        } else if (
          key === 'description' ||
          key === 'defaultDescription' ||
          key === 'defaultResponsibilities' ||
          key === 'defaultRequirements' ||
          key === 'defaultBenefits'
        ) {
          payload[key] = value === '' ? null : value;
        } else {
          payload[key] = value;
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      if (hasSkills) {
        await tx.designationSkill.deleteMany({ where: { designationId: id } });
        if (skillIds.length) {
          await tx.designationSkill.createMany({
            data: skillIds.map((s) => ({
              designationId: id,
              skillId: s.skillId,
              isRequired: s.isRequired ?? true,
            })),
          });
        }
      }

      return tx.designation.update({
        where: { id },
        data: payload,
        include: skillInclude,
      });
    });
  }
}
