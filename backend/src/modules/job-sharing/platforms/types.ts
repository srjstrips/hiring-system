/**
 * Platform-agnostic types for external job posting.
 * LinkedIn/Naukri adapters implement JobPostingAdapter.
 * Do NOT put platform-specific logic in the job-sharing service.
 */

export type JobSharePlatformCode = 'LINKEDIN' | 'NAUKRI';

export type ExternalPostingErrorCode =
  | 'NOT_CONFIGURED'
  | 'CONNECTION_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'INVALID_JOB_DATA'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'POSTING_FAILED'
  | 'ALREADY_POSTED';

/** Normalized job payload mapped from RMS Job fields (platform-agnostic). */
export interface ExternalJobPayload {
  rmsJobId: string;
  title: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  department?: string;
  designation?: string;
  location?: {
    name: string;
    city: string;
    state: string;
    country: string;
  };
  employmentType?: string;
  experienceLevel?: string;
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  showSalary: boolean;
  numberOfPositions: number;
  closingDate?: string;
  applicationUrl?: string;
}

export interface ExternalPostingResult {
  success: boolean;
  externalJobId?: string;
  externalJobUrl?: string;
  errorCode?: ExternalPostingErrorCode;
  errorMessage?: string;
}

export interface ExternalPostingStatus {
  configured: boolean;
  externalJobId?: string;
  externalJobUrl?: string;
  status?: string;
}

/**
 * Contract every platform adapter must implement.
 * Real HTTP calls belong only inside adapter implementations — never in UI or core Jobs.
 */
export interface JobPostingAdapter {
  readonly platform: JobSharePlatformCode;
  readonly displayName: string;

  /** True only when required env credentials/endpoints are present. */
  isConfigured(): boolean;

  /**
   * Post a job to the external platform.
   * Must throw or return failure if not configured — never fake success.
   */
  postJob(payload: ExternalJobPayload): Promise<ExternalPostingResult>;

  updateJob(
    externalJobId: string,
    payload: ExternalJobPayload
  ): Promise<ExternalPostingResult>;

  removeJob(externalJobId: string): Promise<ExternalPostingResult>;

  getPostingStatus(externalJobId: string): Promise<ExternalPostingStatus>;
}
