import type { JobPostingAdapter, JobSharePlatformCode } from './types';
import { linkedInJobPostingService } from './linkedin.adapter';
import { naukriJobPostingService } from './naukri.adapter';

const adapters: Record<JobSharePlatformCode, JobPostingAdapter> = {
  LINKEDIN: linkedInJobPostingService,
  NAUKRI: naukriJobPostingService,
};

export function getPlatformAdapter(platform: JobSharePlatformCode): JobPostingAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`Unsupported job sharing platform: ${platform}`);
  }
  return adapter;
}

export function listPlatformAdapters(): JobPostingAdapter[] {
  return Object.values(adapters);
}

export type { JobPostingAdapter, JobSharePlatformCode, ExternalJobPayload } from './types';
