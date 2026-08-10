import { env } from '../../../config/env';
import type {
  ExternalJobPayload,
  ExternalPostingResult,
  ExternalPostingStatus,
  JobPostingAdapter,
} from './types';

/**
 * LinkedIn job posting adapter.
 *
 * PENDING EXTERNAL API INTEGRATION:
 * Wire real LinkedIn Job Posting API calls here when credentials/endpoints are available.
 * Do not add LinkedIn-specific logic outside this file.
 */
export class LinkedInJobPostingService implements JobPostingAdapter {
  readonly platform = 'LINKEDIN' as const;
  readonly displayName = 'LinkedIn';

  isConfigured(): boolean {
    return Boolean(
      env.LINKEDIN_API_BASE_URL?.trim() &&
        env.LINKEDIN_ACCESS_TOKEN?.trim() &&
        (env.LINKEDIN_CLIENT_ID?.trim() || env.LINKEDIN_ACCESS_TOKEN?.trim())
    );
  }

  async postJob(_payload: ExternalJobPayload): Promise<ExternalPostingResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'LinkedIn integration is not configured yet.',
      };
    }

    // TODO: Implement LinkedIn Job Posting API call using env credentials.
    // Map ExternalJobPayload → LinkedIn API body inside this method only.
    return {
      success: false,
      errorCode: 'NOT_CONFIGURED',
      errorMessage:
        'LinkedIn API integration is pending. Credentials/endpoints have not been connected yet.',
    };
  }

  async updateJob(
    _externalJobId: string,
    _payload: ExternalJobPayload
  ): Promise<ExternalPostingResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'LinkedIn integration is not configured yet.',
      };
    }

    // TODO: Implement LinkedIn job update API.
    return {
      success: false,
      errorCode: 'NOT_CONFIGURED',
      errorMessage: 'LinkedIn API integration is pending.',
    };
  }

  async removeJob(_externalJobId: string): Promise<ExternalPostingResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'LinkedIn integration is not configured yet.',
      };
    }

    // TODO: Implement LinkedIn job remove/close API.
    return {
      success: false,
      errorCode: 'NOT_CONFIGURED',
      errorMessage: 'LinkedIn API integration is pending.',
    };
  }

  async getPostingStatus(_externalJobId: string): Promise<ExternalPostingStatus> {
    return {
      configured: this.isConfigured(),
      status: this.isConfigured() ? 'UNKNOWN' : 'NOT_CONFIGURED',
    };
  }
}

export const linkedInJobPostingService = new LinkedInJobPostingService();
