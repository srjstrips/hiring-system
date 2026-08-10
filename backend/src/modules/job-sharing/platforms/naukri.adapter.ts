import { env } from '../../../config/env';
import type {
  ExternalJobPayload,
  ExternalPostingResult,
  ExternalPostingStatus,
  JobPostingAdapter,
} from './types';

/**
 * Naukri job posting adapter.
 *
 * PENDING EXTERNAL API INTEGRATION:
 * Wire real Naukri job posting API calls here when credentials/endpoints are available.
 * Do not add Naukri-specific logic outside this file.
 */
export class NaukriJobPostingService implements JobPostingAdapter {
  readonly platform = 'NAUKRI' as const;
  readonly displayName = 'Naukri';

  isConfigured(): boolean {
    return Boolean(
      env.NAUKRI_API_BASE_URL?.trim() &&
        env.NAUKRI_API_KEY?.trim() &&
        env.NAUKRI_API_SECRET?.trim()
    );
  }

  async postJob(_payload: ExternalJobPayload): Promise<ExternalPostingResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'Naukri integration is not configured yet.',
      };
    }

    // TODO: Implement Naukri job posting API call using env credentials.
    // Map ExternalJobPayload → Naukri API body inside this method only.
    return {
      success: false,
      errorCode: 'NOT_CONFIGURED',
      errorMessage:
        'Naukri API integration is pending. Credentials/endpoints have not been connected yet.',
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
        errorMessage: 'Naukri integration is not configured yet.',
      };
    }

    // TODO: Implement Naukri job update API.
    return {
      success: false,
      errorCode: 'NOT_CONFIGURED',
      errorMessage: 'Naukri API integration is pending.',
    };
  }

  async removeJob(_externalJobId: string): Promise<ExternalPostingResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'Naukri integration is not configured yet.',
      };
    }

    // TODO: Implement Naukri job remove/close API.
    return {
      success: false,
      errorCode: 'NOT_CONFIGURED',
      errorMessage: 'Naukri API integration is pending.',
    };
  }

  async getPostingStatus(_externalJobId: string): Promise<ExternalPostingStatus> {
    return {
      configured: this.isConfigured(),
      status: this.isConfigured() ? 'UNKNOWN' : 'NOT_CONFIGURED',
    };
  }
}

export const naukriJobPostingService = new NaukriJobPostingService();
