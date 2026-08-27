/** Linear recruiting pipeline, in forward order. Mirrors backend/src/modules/applications/stage-order.ts. */
export const PIPELINE_ORDER = [
  'APPLIED', 'SCREENING', 'PERSONALITY_ASSESSMENT', 'DEPT_WORKING_TEST',
  'HOD_HR_INTERVIEW', 'DIRECTOR_INTERVIEW', 'SHORTLISTED',
  'DOCUMENT_VERIFICATION', 'OFFER_LETTER', 'OFFER_ACCEPTED',
  'VERIFICATION_COMPLETED', 'JOINING',
] as const;

export type PipelineStage = (typeof PIPELINE_ORDER)[number];

/** Terminal outcomes — end the pipeline permanently, from any active stage. */
export const TERMINAL_STATUSES = [
  'REJECTED', 'WITHDRAWN', 'OFFER_DECLINED',
  'VERIFICATION_FAILED', 'DID_NOT_JOIN', 'POSITION_CLOSED', 'CANDIDATE_UNRESPONSIVE',
] as const;

/** Non-pipeline statuses always offered in "Change Stage" (side exits/pauses). */
export const OUTCOME_STATUSES = [
  'REJECTED', 'WITHDRAWN', 'ON_HOLD',
  'OFFER_DECLINED', 'VERIFICATION_FAILED', 'DID_NOT_JOIN',
  'POSITION_CLOSED', 'CANDIDATE_UNRESPONSIVE',
] as const;

export const stageLabel = (s: string) => s.replace(/_/g, ' ');

function isPipelineStage(status: string): status is PipelineStage {
  return (PIPELINE_ORDER as readonly string[]).includes(status);
}

/** True once an application has reached a terminal outcome — locked, no further stage changes. */
export function isStageLocked(currentStatus: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(currentStatus);
}

/**
 * Resolves where an application sits in the linear pipeline. ON_HOLD is a pause, not
 * a stage of its own, so it resolves to the last real pipeline stage reached before
 * the hold (found by scanning timeline history, newest first).
 */
export function getEffectiveStageIndex(
  currentStatus: string,
  timeline: Array<{ toStatus: string }>
): number {
  if (isPipelineStage(currentStatus)) return PIPELINE_ORDER.indexOf(currentStatus);
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
 * Every stage-change option to offer in a "Change Stage" control right now: pipeline
 * stages strictly ahead of the current one, plus the always-available side exits.
 * Empty once the application has reached a terminal outcome.
 */
export function getSelectableStages(
  currentStatus: string,
  timeline: Array<{ toStatus: string }>
): string[] {
  if (isStageLocked(currentStatus)) return [];
  const currentIndex = getEffectiveStageIndex(currentStatus, timeline);
  const forward = PIPELINE_ORDER.filter((_, i) => i > currentIndex);
  const outcomes = OUTCOME_STATUSES.filter((s) => s !== currentStatus);
  return [...forward, ...outcomes];
}
