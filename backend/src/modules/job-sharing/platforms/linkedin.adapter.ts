import { env } from '../../../config/env';
import type {
  ExternalJobPayload,
  ExternalPostingResult,
  ExternalPostingStatus,
  JobPostingAdapter,
} from './types';

const LINKEDIN_API = 'https://api.linkedin.com/v2';

export class LinkedInJobPostingService implements JobPostingAdapter {
  readonly platform = 'LINKEDIN' as const;
  readonly displayName = 'LinkedIn';

  isConfigured(): boolean {
    return Boolean(
      env.LINKEDIN_ACCESS_TOKEN?.trim() &&
      env.LINKEDIN_COMPANY_ID?.trim()
    );
  }

  private headers() {
    return {
      'Authorization': `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  async postJob(payload: ExternalJobPayload): Promise<ExternalPostingResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        errorCode: 'NOT_CONFIGURED',
        errorMessage: 'LinkedIn integration is not configured. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_COMPANY_ID.',
      };
    }

    try {
      const companyUrn = `urn:li:organization:${env.LINKEDIN_COMPANY_ID}`;

      // Build post text
      const location = payload.location ? `${payload.location.city}, ${payload.location.state}` : '';
      const salaryText = payload.showSalary && payload.salaryMin && payload.salaryMax
        ? `\n💰 Salary: ₹${Math.round(payload.salaryMin / 100000)}L – ₹${Math.round(payload.salaryMax / 100000)}L`
        : '';
      const skillsText = payload.skills.length
        ? `\n🛠 Skills: ${payload.skills.slice(0, 6).join(', ')}`
        : '';
      const deptText = payload.department ? `\n🏢 Department: ${payload.department}` : '';
      const typeText = payload.employmentType ? `\n⏰ Type: ${payload.employmentType}` : '';

      const postText = [
        `🚀 We're Hiring: ${payload.title}`,
        '',
        `SRJ Group is looking for a talented ${payload.title} to join our team.`,
        '',
        `📍 Location: ${location}`,
        deptText,
        typeText,
        salaryText,
        skillsText,
        '',
        `Apply now: ${payload.applicationUrl}`,
        '',
        '#Hiring #JobOpening #SRJGroup #Careers',
      ].filter((l) => l !== undefined).join('\n');

      const body = {
        author: companyUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: postText },
            shareMediaCategory: 'ARTICLE',
            media: [
              {
                status: 'READY',
                description: { text: payload.description.replace(/<[^>]*>/g, '').slice(0, 256) },
                originalUrl: payload.applicationUrl,
                title: { text: `${payload.title} — SRJ Group` },
              },
            ],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      };

      const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        return {
          success: false,
          errorCode: res.status === 401 ? 'AUTHENTICATION_FAILED' : 'API_ERROR',
          errorMessage: `LinkedIn API error ${res.status}: ${err.slice(0, 200)}`,
        };
      }

      const data = await res.json() as { id?: string };
      const postId = data.id ?? '';
      const postUrl = postId
        ? `https://www.linkedin.com/feed/update/${postId}/`
        : `https://www.linkedin.com/company/${env.LINKEDIN_COMPANY_ID}/posts/`;

      return { success: true, externalJobId: postId, externalJobUrl: postUrl };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'CONNECTION_FAILED',
        errorMessage: err?.message ?? 'Failed to connect to LinkedIn API',
      };
    }
  }

  async updateJob(externalJobId: string, payload: ExternalJobPayload): Promise<ExternalPostingResult> {
    // LinkedIn UGC posts cannot be edited via API — delete and re-post
    await this.removeJob(externalJobId);
    return this.postJob(payload);
  }

  async removeJob(externalJobId: string): Promise<ExternalPostingResult> {
    if (!this.isConfigured()) {
      return { success: false, errorCode: 'NOT_CONFIGURED', errorMessage: 'LinkedIn not configured.' };
    }
    if (!externalJobId) return { success: true };

    try {
      const res = await fetch(`${LINKEDIN_API}/ugcPosts/${encodeURIComponent(externalJobId)}`, {
        method: 'DELETE',
        headers: this.headers(),
      });
      if (!res.ok && res.status !== 404) {
        return { success: false, errorCode: 'API_ERROR', errorMessage: `LinkedIn delete error: ${res.status}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, errorCode: 'CONNECTION_FAILED', errorMessage: err?.message };
    }
  }

  async getPostingStatus(externalJobId: string): Promise<ExternalPostingStatus> {
    return {
      configured: this.isConfigured(),
      externalJobId,
      status: this.isConfigured() ? 'POSTED' : 'NOT_CONFIGURED',
    };
  }
}

export const linkedInJobPostingService = new LinkedInJobPostingService();
