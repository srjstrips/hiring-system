import type { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { AppError, ForbiddenError, UnauthorizedError } from '@/utils/errors';
import { verifyAccessToken, verifyCandidateAccessToken } from '@/utils/jwt';
import {
  joinCallRoom,
  leaveCallRoom,
  pullCallSignals,
  pushCallSignal,
  type CallRole,
  type CallSignalType,
} from './interview-call.store';

type Requester =
  | { kind: 'staff'; userId: string }
  | { kind: 'candidate'; candidateId: string };

function getBearerAuthorization(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1] ?? null;
}

function getRequesterFromAuthHeader(req: Request): Requester | null {
  const token = getBearerAuthorization(req);
  if (!token) return null;

  // Staff tokens and candidate tokens use different JWT "audience",
  // so we can safely attempt both verifications.
  try {
    const payload = verifyAccessToken(token);
    return { kind: 'staff', userId: payload.sub };
  } catch {
    // try candidate
  }

  try {
    const payload = verifyCandidateAccessToken(token);
    return { kind: 'candidate', candidateId: payload.sub };
  } catch {
    throw new UnauthorizedError('Invalid access token');
  }
}

async function requireInterview(token: string, requester: Requester | null) {
  const interview = await prisma.interview.findFirst({
    where: { meetingToken: token },
    include: {
      application: {
        include: {
          candidate: { select: { id: true, firstName: true, lastName: true } },
          job: { select: { title: true } },
        },
      },
      interviewersList: { select: { userId: true } },
    },
  });

  if (!interview || interview.mode !== 'VIDEO') throw new AppError('Interview room not found', 404);
  if (interview.status === 'COMPLETED') throw new AppError('Interview completed', 410);
  if (interview.status === 'CANCELLED') throw new AppError('Interview cancelled', 410);
  if (interview.status === 'NO_SHOW') throw new AppError('Interview marked as no-show', 410);

  // If the caller is authenticated, enforce access control.
  if (requester) {
    const candidateId = interview.application.candidate.id;

    if (requester.kind === 'staff') {
      const staffAllowed =
        interview.scheduledById === requester.userId ||
        interview.interviewersList.some((i) => i.userId === requester.userId);
      if (!staffAllowed) throw new ForbiddenError('You are not allowed to join this interview');
    }

    if (requester.kind === 'candidate') {
      if (candidateId !== requester.candidateId) throw new ForbiddenError('You are not allowed to join this interview');
    }
  }

  return interview;
}

class PublicInterviewCallController {
  async getRoom(req: Request, res: Response) {
    const token = String(req.params['token'] ?? '');
    const requester = getRequesterFromAuthHeader(req);
    const interview = await requireInterview(token, requester);
    const candidate = interview.application.candidate;

    res.json({
      success: true,
      data: {
        id: interview.id,
        applicationId: interview.applicationId,
        status: interview.status,
        title: interview.title,
        round: interview.round,
        scheduledAt: interview.scheduledAt,
        durationMinutes: interview.durationMinutes,
        jobTitle: interview.application.job.title,
        candidateName: `${candidate.firstName} ${candidate.lastName}`.trim(),
      },
    });
  }

  async join(req: Request, res: Response) {
    const token = String(req.params['token'] ?? '');
    const requester = getRequesterFromAuthHeader(req);
    await requireInterview(token, requester);

    const body = req.body as { role?: string; name?: string };
    const roleFromBody: CallRole = body.role === 'host' ? 'host' : 'guest';

    // If authenticated, derive call role from the authenticated participant type.
    // This prevents any user from joining as host/guest just by altering query params.
    const role: CallRole =
      requester?.kind === 'staff' ? 'host' : requester?.kind === 'candidate' ? 'guest' : roleFromBody;

    try {
      const joined = joinCallRoom(token, role, String(body.name ?? ''));
      res.json({ success: true, data: joined });
    } catch (err: any) {
      if (err?.message === 'ROOM_FULL') throw new AppError('This video room is full', 409);
      throw err;
    }
  }

  async poll(req: Request, res: Response) {
    const token = String(req.params['token'] ?? '');
    const requester = getRequesterFromAuthHeader(req);
    await requireInterview(token, requester);

    const peerId = String(req.query['peerId'] ?? '');
    const after = Number(req.query['after'] ?? 0);
    if (!peerId) throw new AppError('peerId is required', 400);

    const data = pullCallSignals(token, peerId, Number.isFinite(after) ? after : 0);
    if ((data as any).missing) throw new AppError('Rejoin the video room', 409);
    res.json({ success: true, data });
  }

  async signal(req: Request, res: Response) {
    const token = String(req.params['token'] ?? '');
    const requester = getRequesterFromAuthHeader(req);
    await requireInterview(token, requester);

    const body = req.body as { peerId?: string; type?: CallSignalType; payload?: unknown };
    const peerId = String(body.peerId ?? '');
    const type = body.type;
    if (!peerId || !type || !['offer', 'answer', 'ice', 'leave'].includes(type)) {
      throw new AppError('Invalid signal', 400);
    }
    try {
      if (type === 'leave') {
        leaveCallRoom(token, peerId);
        res.json({ success: true, data: { left: true } });
        return;
      }
      const seq = pushCallSignal(token, peerId, type, body.payload ?? null);
      res.json({ success: true, data: { seq } });
    } catch (err: any) {
      if (err?.message === 'NOT_IN_ROOM') throw new AppError('Rejoin the video room', 409);
      throw err;
    }
  }
}

export default new PublicInterviewCallController();
