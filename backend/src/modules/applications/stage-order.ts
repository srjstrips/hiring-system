import { AppError } from '@/utils/errors';
import { prisma } from '@/config/database';

/** Stages that permanently end the pipeline — can never move again. */
export const TERMINAL_STATUSES = [
  'REJECTED', 'WITHDRAWN', 'OFFER_DECLINED',
  'VERIFICATION_FAILED', 'DID_NOT_JOIN', 'POSITION_CLOSED', 'CANDIDATE_UNRESPONSIVE',
];

/** Stages that are side-exits — pause/outcome, not part of linear order. */
export const SIDE_EXIT_STATUSES = [
  'REJECTED', 'WITHDRAWN', 'ON_HOLD',
  'OFFER_DECLINED', 'VERIFICATION_FAILED', 'DID_NOT_JOIN',
  'POSITION_CLOSED', 'CANDIDATE_UNRESPONSIVE',
];

/** Fixed stages that drive business logic (offers, joining, etc.) */
export const FIXED_STAGES = {
  APPLIED: 'APPLIED',
  OFFER_LETTER: 'OFFER_LETTER',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  JOINING: 'JOINING',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
  ON_HOLD: 'ON_HOLD',
  OFFER_DECLINED: 'OFFER_DECLINED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  DID_NOT_JOIN: 'DID_NOT_JOIN',
  POSITION_CLOSED: 'POSITION_CLOSED',
  CANDIDATE_UNRESPONSIVE: 'CANDIDATE_UNRESPONSIVE',
} as const;

/** Cached ordered pipeline (refreshed every 60s) */
let pipelineCache: string[] = [];
let pipelineCachedAt = 0;
const CACHE_TTL = 60_000;

export async function getPipelineOrder(): Promise<string[]> {
  if (pipelineCache.length && Date.now() - pipelineCachedAt < CACHE_TTL) {
    return pipelineCache;
  }
  const stages = await prisma.pipelineStage.findMany({
    where: { isActive: true, key: { notIn: SIDE_EXIT_STATUSES } },
    orderBy: { stageOrder: 'asc' },
    select: { key: true },
  });
  pipelineCache = stages.map((s) => s.key);
  pipelineCachedAt = Date.now();
  return pipelineCache;
}

export function clearPipelineCache() {
  pipelineCache = [];
}

/** Fallback synchronous pipeline order (used only when async context unavailable) */
export const PIPELINE_ORDER_FALLBACK = [
  'APPLIED', 'SCREENING', 'PERSONALITY_ASSESSMENT', 'DEPT_WORKING_TEST',
  'HOD_HR_INTERVIEW', 'DIRECTOR_INTERVIEW', 'SHORTLISTED',
  'DOCUMENT_VERIFICATION', 'OFFER_LETTER', 'OFFER_ACCEPTED',
  'VERIFICATION_COMPLETED', 'JOINING',
];

export function getEffectiveStageIndex(
  currentStatus: string,
  timeline: { toStatus: string }[],
  pipelineOrder: string[]
): number {
  const idx = pipelineOrder.indexOf(currentStatus);
  if (idx !== -1) return idx;

  if (currentStatus === 'ON_HOLD') {
    for (let i = timeline.length - 1; i >= 0; i--) {
      const prior = timeline[i]!.toStatus;
      const priorIdx = pipelineOrder.indexOf(prior);
      if (priorIdx !== -1) return priorIdx;
    }
    return 0;
  }
  return -1;
}

export async function assertForwardTransition(
  currentStatus: string,
  targetStatus: string,
  timeline: { toStatus: string }[]
): Promise<void> {
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    throw new AppError(
      `This application is already ${currentStatus} and cannot be moved to another stage.`,
      400,
      'STAGE_LOCKED'
    );
  }

  if (SIDE_EXIT_STATUSES.includes(targetStatus)) return;

  const pipelineOrder = await getPipelineOrder();
  const currentIndex = getEffectiveStageIndex(currentStatus, timeline, pipelineOrder);
  const targetIndex = pipelineOrder.indexOf(targetStatus);

  if (targetIndex === -1) {
    throw new AppError(`Unknown pipeline stage: ${targetStatus}`, 400);
  }

  if (targetIndex <= currentIndex) {
    throw new AppError(
      `Cannot move back to "${targetStatus}" — the candidate has already passed this stage.`,
      400,
      'STAGE_LOCKED'
    );
  }
}

export async function isValidForwardTransition(
  currentStatus: string,
  targetStatus: string,
  timeline: { toStatus: string }[]
): Promise<boolean> {
  try {
    await assertForwardTransition(currentStatus, targetStatus, timeline);
    return true;
  } catch {
    return false;
  }
}
