import { AppError } from '@/utils/errors';
import jobsRepository from './jobs.repository';
import type { CreateJobDto, JobQueryDto } from './jobs.validator';

class JobsService {
  async getAll(query: JobQueryDto) {
    return jobsRepository.findAll(query);
  }

  async getById(id: string) {
    const job = await jobsRepository.findById(id);
    if (!job) throw new AppError('Job not found', 404);
    return job;
  }

  async getBySlug(slug: string) {
    const job = await jobsRepository.findBySlug(slug);
    if (!job) throw new AppError('Job not found', 404);
    return job;
  }

  async create(data: CreateJobDto, createdById: string) {
    return jobsRepository.create(data, createdById);
  }

  async update(id: string, data: Partial<CreateJobDto>, updatedById: string) {
    await this.getById(id);
    return jobsRepository.update(id, data, updatedById);
  }

  async publish(id: string, userId: string) {
    const job = await this.getById(id);
    if (job.isPublished) throw new AppError('Job is already published', 400);
    return jobsRepository.publish(id, userId);
  }

  async unpublish(id: string, userId: string) {
    const job = await this.getById(id);
    if (!job.isPublished) throw new AppError('Job is not published', 400);
    return jobsRepository.unpublish(id, userId);
  }

  async delete(id: string) {
    await this.getById(id);
    return jobsRepository.softDelete(id);
  }
}

export default new JobsService();
