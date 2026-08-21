import type { CandidateStatus } from '@prisma/client';
import { AppError } from '@/utils/errors';

/** Linear recruiting pipeline, in forward order. Once an application passes a stage, it is locked. */
export const PIPELINE_ORDER: CandidateStatus[] = [
  'APPLIED',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW_ROUND_1',
  'INTERVIEW_ROUND_2',
  'HR_ROUND',
  'SELECTED',
  'OFFER_SENT',
  'OFFER_ACCEPTED',
  'JOINED',
];

/** Terminal outcomes — end the pipeline permanently, from any active stage. */
export const TERMINAL_STATUSES: CandidateStatus[] = ['REJECTED', 'WITHDRAWN'];

function isPipelineStage(status: CandidateStatus): boolean {
  return PIPELINE_ORDER.includes(status);
}

/**
 * Resolves where an application sits in the linear pipeline. ON_HOLD is a pause, not
 * a stage of its own, so it resolves to the last real pipeline stage reached before
 * the hold (found by scanning timeline history). Terminal statuses have no forward
 * position — they can never move again.
 */
export function getEffectiveStageIndex(
  currentStatus: CandidateStatus,
  timeline: { toStatus: CandidateStatus }[]
): number {
  if (isPipelineStage(currentStatus)) {
    return PIPELINE_ORDER.indexOf(currentStatus);
  }
  if (currentStatus === 'ON_HOLD') {
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const prior = timeline[i]!.toStatus;
      if (isPipelineStage(prior)) return PIPELINE_ORDER.indexOf(prior);
    }
    return 0;
  }
  return -1;
}

/**
 * Throws unless moving from currentStatus to targetStatus is a valid forward move.
 * - Terminal statuses (REJECTED/WITHDRAWN) can never be moved from.
 * - Moving to a terminal status or to ON_HOLD is always allowed (side exits/pauses,
 *   not part of the linear order).
 * - Moving between pipeline stages must strictly advance (skipping ahead is fine;
 *   moving to the current or an earlier stage is not — that stage is locked).
 */
export function assertForwardTransition(
  currentStatus: CandidateStatus,
  targetStatus: CandidateStatus,
  timeline: { toStatus: CandidateStatus }[]
): void {
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    throw new AppError(
      `This application is already ${currentStatus} and cannot be moved to another stage.`,
      400,
      'STAGE_LOCKED'
    );
  }

  if (TERMINAL_STATUSES.includes(targetStatus) || targetStatus === 'ON_HOLD') {
    return;
  }

  const currentIndex = getEffectiveStageIndex(currentStatus, timeline);
  const targetIndex = PIPELINE_ORDER.indexOf(targetStatus);

  if (targetIndex === -1) {
    throw new AppError(`Unknown pipeline stage: ${targetStatus}`, 400);
  }

  if (targetIndex <= currentIndex) {
    throw new AppError(
      `Cannot move back to "${targetStatus}" — the candidate has already passed this stage and it is locked. Only forward moves are allowed.`,
      400,
      'STAGE_LOCKED'
    );
  }
}

/** Non-throwing check, for call sites where an invalid move should be silently skipped rather than failing the whole request. */
export function isValidForwardTransition(
  currentStatus: CandidateStatus,
  targetStatus: CandidateStatus,
  timeline: { toStatus: CandidateStatus }[]
): boolean {
  try {
    assertForwardTransition(currentStatus, targetStatus, timeline);
    return true;
  } catch {
    return false;
  }
}
