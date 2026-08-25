import { api } from './axios';

export interface PipelineStage {
  key: string;
  label: string;
  color: string;
  type: string;
  stageOrder: number;
  isActive: boolean;
  isFixed: boolean;
  createdAt: string;
  updatedAt: string;
}

export const pipelineStagesApi = {
  getAll: () => api.get<{ success: boolean; data: PipelineStage[] }>('/pipeline-stages'),
  create: (data: { key: string; label: string; color?: string; type?: string; stageOrder: number }) =>
    api.post<{ success: boolean; data: PipelineStage }>('/pipeline-stages', data),
  update: (key: string, data: Partial<Pick<PipelineStage, 'label' | 'color' | 'type' | 'stageOrder' | 'isActive'>>) =>
    api.put<{ success: boolean; data: PipelineStage }>(`/pipeline-stages/${key}`, data),
  remove: (key: string) => api.delete(`/pipeline-stages/${key}`),
  reorder: (order: { key: string; stageOrder: number }[]) =>
    api.put('/pipeline-stages/reorder', { order }),
};
