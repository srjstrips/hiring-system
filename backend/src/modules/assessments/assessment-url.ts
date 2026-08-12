import { env } from '@/config/env';

/** Build the candidate-facing assessment URL from a secure assignment token. */
export function buildCandidateAssessmentUrl(secureToken: string): string {
  const base = env.FRONTEND_URL.replace(/\/$/, '');
  return `${base}/assessment/t/${secureToken}`;
}
