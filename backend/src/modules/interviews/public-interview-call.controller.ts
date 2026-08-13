import type { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import {
  joinCallRoom,
  leaveCallRoom,
  pullCallSignals,
  pushCallSignal,
  type CallRole,
  type CallSignalType,
} from './interview-call.store';

async function requireInterview(token: string) {
  const interview = await prisma.interview.findFirst({
    where: { meetingToken: token },
    include: {
      application: {
        include: {
          candidate: { select: { firstName: true, lastName: true } },
          job: { select: { title: true } },
        },
      },
    },
  });
  if (!interview || interview.mode !== 'VIDEO') throw new AppError('Interview room not found', 404);
  if (['CANCELLED', 'COMPLETED'].includes(interview.status)) {
    throw new AppError('This interview is no longer active', 410);
  }
  return interview;
}

class PublicInterviewCallController {
  async getRoom(req: Request, res: Response) {
    const token = String(req.params['token'] ?? '');
    const interview = await requireInterview(token);
    const candidate = interview.application.candidate;
    res.json({
      success: true,
      data: {
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
    await requireInterview(token);
    const body = req.body as { role?: string; name?: string };
    const role: CallRole = body.role === 'host' ? 'host' : 'guest';
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
    await requireInterview(token);
    const peerId = String(req.query['peerId'] ?? '');
    const after = Number(req.query['after'] ?? 0);
    if (!peerId) throw new AppError('peerId is required', 400);
    const data = pullCallSignals(token, peerId, Number.isFinite(after) ? after : 0);
    if ((data as any).missing) throw new AppError('Rejoin the video room', 409);
    res.json({ success: true, data });
  }

  async signal(req: Request, res: Response) {
    const token = String(req.params['token'] ?? '');
    await requireInterview(token);
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
