import { MasterRepository } from './master.repository';
import { NotFoundError, ConflictError } from '../../utils/errors';
import type { MasterQueryDto, ToggleActiveDto } from './master.validators';

export class MasterService<T extends { id: string }> {
  constructor(
    private readonly repo: MasterRepository<T>,
    private readonly resourceName: string,
    private readonly searchFields: string[] = ['name']
  ) {}

  async findAll(query: MasterQueryDto) {
    return this.repo.findAll(query, this.searchFields);
  }

  async findAllActive() {
    return this.repo.findAllActive();
  }

  async findById(id: string): Promise<T> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundError(this.resourceName);
    return record;
  }

  async create(data: Record<string, unknown>): Promise<T> {
    const name = data['name'] as string | undefined;
    if (name) {
      const existing = await this.repo.findByName(
        name,
        undefined,
        data['departmentId'] as string | undefined
      );
      if (existing) throw new ConflictError(`${this.resourceName} with this name already exists`);
    }
    return this.repo.create(data);
  }

  async update(id: string, data: Record<string, unknown>): Promise<T> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundError(this.resourceName);

    const name = data['name'] as string | undefined;
    if (name) {
      const departmentId =
        (data['departmentId'] as string | undefined) ??
        ((record as { departmentId?: string }).departmentId);
      const existing = await this.repo.findByName(name, id, departmentId);
      if (existing) throw new ConflictError(`${this.resourceName} with this name already exists`);
    }

    return this.repo.update(id, data);
  }

  async toggleActive(id: string, dto: ToggleActiveDto): Promise<T> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundError(this.resourceName);
    return this.repo.toggleActive(id, dto.isActive);
  }

  async delete(id: string): Promise<void> {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundError(this.resourceName);
    await this.repo.softDelete(id);
  }
}
