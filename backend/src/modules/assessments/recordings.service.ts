import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { AppError } from '@/utils/errors';
import { logger } from '@/config/logger';
import { buildRecordingPrefix, objectStorage } from '@/services/storage/object-storage';
import type { CompleteRecordingDto, RecordingEventDto, StartRecordingsDto } from './recordings.validator';

type RecordingType = 'CAMERA' | 'SCREEN';

async function loadAssignmentByToken(secureToken: string) {
  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { secureToken },
    include: { assessment: { select: { id: true, status: true } } },
  });
  if (!assignment) throw new AppError('Assessment link is invalid or has expired.', 404, 'INVALID_TOKEN');
  return assignment;
}

async function assertAttemptOwned(secureToken: string, attemptId: string) {
  const assignment = await loadAssignmentByToken(secureToken);
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, assignmentId: assignment.id, candidateId: assignment.candidateId },
  });
  if (!attempt) throw new AppError('Assessment attempt not found', 404);
  return { assignment, attempt };
}

function retentionExpiresAt(from = new Date()) {
  const days = env.ASSESSMENT_RECORDING_RETENTION_DAYS || 90;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

class RecordingsService {
  serializeRecording(r: {
    id: string;
    attemptId: string;
    recordingType: string;
    mimeType: string | null;
    fileSize: number | null;
    durationSeconds: number | null;
    chunkCount: number;
    status: string;
    startedAt: Date | null;
    endedAt: Date | null;
    expiresAt: Date | null;
    failureReason: string | null;
  }) {
    return {
      id: r.id,
      attemptId: r.attemptId,
      recordingType: r.recordingType,
      mimeType: r.mimeType,
      fileSize: r.fileSize,
      durationSeconds: r.durationSeconds,
      chunkCount: r.chunkCount,
      status: r.status,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      expiresAt: r.expiresAt,
      failureReason: r.failureReason,
    };
  }

  private async logEvent(
    attemptId: string,
    recordingId: string | null,
    eventType: string,
    message?: string | null
  ) {
    return prisma.assessmentRecordingEvent.create({
      data: {
        attemptId,
        recordingId: recordingId ?? undefined,
        eventType,
        message: message ?? undefined,
      },
    });
  }

  async startRecordings(secureToken: string, dto: StartRecordingsDto) {
    if (!dto.consent) throw new AppError('Recording consent is required', 400);
    const { assignment, attempt } = await assertAttemptOwned(secureToken, dto.attemptId);
    if (attempt.submittedAt) throw new AppError('Assessment already submitted', 400);

    const consentAt = new Date();
    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        recordingConsent: true,
        recordingConsentAt: attempt.recordingConsentAt ?? consentAt,
      },
    });
    await this.logEvent(attempt.id, null, 'RECORDING_CONSENT_GRANTED', 'Candidate consented to recording');

    const ensure = async (type: RecordingType, mimeType?: string) => {
      const existing = await prisma.assessmentRecording.findUnique({
        where: { attemptId_recordingType: { attemptId: attempt.id, recordingType: type } },
      });
      if (existing) {
        if (existing.status === 'READY' || existing.status === 'DELETED') return existing;
        return prisma.assessmentRecording.update({
          where: { id: existing.id },
          data: {
            status: 'UPLOADING',
            mimeType: mimeType || existing.mimeType,
            startedAt: existing.startedAt ?? new Date(),
            failureReason: null,
          },
        });
      }

      const prefix = buildRecordingPrefix({
        assessmentId: assignment.assessmentId,
        assignmentId: assignment.id,
        attemptId: attempt.id,
        recordingType: type,
      });

      return prisma.assessmentRecording.create({
        data: {
          attemptId: attempt.id,
          assignmentId: assignment.id,
          candidateId: assignment.candidateId,
          assessmentId: assignment.assessmentId,
          recordingType: type,
          storageKey: `${prefix}/final`,
          mimeType: mimeType || null,
          status: 'UPLOADING',
          startedAt: new Date(),
        },
      });
    };

    const camera = await ensure('CAMERA', dto.cameraMimeType);
    const screen = await ensure('SCREEN', dto.screenMimeType);

    const cameraNext = await prisma.assessmentRecordingChunk.aggregate({
      where: { recordingId: camera.id },
      _max: { chunkIndex: true },
    });
    const screenNext = await prisma.assessmentRecordingChunk.aggregate({
      where: { recordingId: screen.id },
      _max: { chunkIndex: true },
    });

    await this.logEvent(attempt.id, camera.id, 'CAMERA_RECORDING_STARTED', 'Candidate video + audio recording started');
    await this.logEvent(attempt.id, screen.id, 'SCREEN_RECORDING_STARTED', 'Screen recording started');

    return {
      attemptId: attempt.id,
      recordingConsent: true,
      recordingConsentAt: consentAt,
      camera: {
        ...this.serializeRecording(camera),
        nextChunkIndex: (cameraNext._max.chunkIndex ?? -1) + 1,
      },
      screen: {
        ...this.serializeRecording(screen),
        nextChunkIndex: (screenNext._max.chunkIndex ?? -1) + 1,
      },
    };
  }

  async uploadChunk(
    secureToken: string,
    recordingId: string,
    chunkIndex: number,
    buffer: Buffer,
    mimeType?: string
  ) {
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) throw new AppError('Invalid chunk index', 400);
    if (!buffer?.length) throw new AppError('Empty chunk', 400);

    const recording = await prisma.assessmentRecording.findUnique({ where: { id: recordingId } });
    if (!recording) throw new AppError('Recording not found', 404);
    await assertAttemptOwned(secureToken, recording.attemptId);

    if (recording.status === 'READY' || recording.status === 'DELETED') {
      throw new AppError('Recording is already finalized', 400);
    }

    const prefix = recording.storageKey.replace(/\/final(\.webm)?$/, '');
    const chunkKey = `${prefix}/chunks/chunk-${String(chunkIndex).padStart(5, '0')}`;
    await objectStorage.putObject(chunkKey, buffer, mimeType || recording.mimeType || 'video/webm');

    await prisma.assessmentRecordingChunk.upsert({
      where: { recordingId_chunkIndex: { recordingId, chunkIndex } },
      create: { recordingId, chunkIndex, storageKey: chunkKey, byteSize: buffer.length },
      update: { storageKey: chunkKey, byteSize: buffer.length, uploadedAt: new Date() },
    });

    const chunkCount = await prisma.assessmentRecordingChunk.count({ where: { recordingId } });
    await prisma.assessmentRecording.update({
      where: { id: recordingId },
      data: {
        chunkCount,
        status: 'UPLOADING',
        mimeType: mimeType || recording.mimeType,
        failureReason: null,
      },
    });

    return { recordingId, chunkIndex, byteSize: buffer.length, chunkCount };
  }

  async completeRecording(secureToken: string, recordingId: string, dto: CompleteRecordingDto) {
    const recording = await prisma.assessmentRecording.findUnique({
      where: { id: recordingId },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });
    if (!recording) throw new AppError('Recording not found', 404);
    await assertAttemptOwned(secureToken, recording.attemptId);

    if (dto.failed) {
      const updated = await prisma.assessmentRecording.update({
        where: { id: recordingId },
        data: {
          status: 'FAILED',
          endedAt: new Date(),
          failureReason: dto.failureReason || 'Recording failed',
          durationSeconds: dto.durationSeconds ?? recording.durationSeconds,
          expiresAt: retentionExpiresAt(),
        },
      });
      await this.logEvent(
        recording.attemptId,
        recordingId,
        recording.recordingType === 'CAMERA' ? 'CAMERA_RECORDING_STOPPED' : 'SCREEN_RECORDING_STOPPED',
        dto.failureReason || 'Recording marked failed'
      );
      await this.logEvent(recording.attemptId, recordingId, 'UPLOAD_FAILURE', dto.failureReason);
      return this.serializeRecording(updated);
    }

    await prisma.assessmentRecording.update({
      where: { id: recordingId },
      data: { status: 'PROCESSING' },
    });

    try {
      if (!recording.chunks.length) throw new Error('No recording chunks uploaded');

      const parts: Buffer[] = [];
      let totalSize = 0;
      for (const chunk of recording.chunks) {
        const buf = await objectStorage.getObjectBuffer(chunk.storageKey);
        parts.push(buf);
        totalSize += buf.length;
      }

      const finalKey = recording.storageKey.endsWith('/final')
        ? `${recording.storageKey}.webm`
        : recording.storageKey;
      await objectStorage.putObject(finalKey, Buffer.concat(parts), recording.mimeType || 'video/webm');

      const updated = await prisma.assessmentRecording.update({
        where: { id: recordingId },
        data: {
          storageKey: finalKey,
          status: 'READY',
          endedAt: new Date(),
          fileSize: totalSize,
          durationSeconds: dto.durationSeconds ?? recording.durationSeconds,
          expiresAt: retentionExpiresAt(),
          failureReason: null,
        },
      });

      await this.logEvent(
        recording.attemptId,
        recordingId,
        recording.recordingType === 'CAMERA' ? 'CAMERA_RECORDING_STOPPED' : 'SCREEN_RECORDING_STOPPED',
        'Recording finalized'
      );
      await this.logEvent(recording.attemptId, recordingId, 'RECORDING_COMPLETED', 'Recording ready for HR review');
      return this.serializeRecording(updated);
    } catch (err: any) {
      logger.error('Failed to finalize recording', err);
      const updated = await prisma.assessmentRecording.update({
        where: { id: recordingId },
        data: {
          status: 'FAILED',
          endedAt: new Date(),
          failureReason: err?.message || 'Failed to finalize recording',
          expiresAt: retentionExpiresAt(),
        },
      });
      await this.logEvent(recording.attemptId, recordingId, 'UPLOAD_FAILURE', updated.failureReason || undefined);
      return this.serializeRecording(updated);
    }
  }

  async logPublicEvent(secureToken: string, dto: RecordingEventDto) {
    await assertAttemptOwned(secureToken, dto.attemptId);
    if (dto.recordingId) {
      const rec = await prisma.assessmentRecording.findFirst({
        where: { id: dto.recordingId, attemptId: dto.attemptId },
      });
      if (!rec) throw new AppError('Recording not found', 404);
    }
    return this.logEvent(dto.attemptId, dto.recordingId ?? null, dto.eventType, dto.message);
  }

  async getViewUrlForHr(recordingId: string, assessmentId: string) {
    const recording = await prisma.assessmentRecording.findFirst({
      where: { id: recordingId, assessmentId, status: { not: 'DELETED' } },
    });
    if (!recording) throw new AppError('Recording not found', 404);
    if (recording.status !== 'READY') {
      throw new AppError(`Recording is not ready (status: ${recording.status})`, 400);
    }

    const ttl = env.ASSESSMENT_RECORDING_VIEW_URL_TTL_SECONDS || 600;
    const signed = objectStorage.getSignedDownloadUrl
      ? await objectStorage.getSignedDownloadUrl(recording.storageKey, ttl)
      : null;

    if (signed) {
      return {
        url: signed,
        expiresInSeconds: ttl,
        mimeType: recording.mimeType,
        recordingType: recording.recordingType,
        provider: 's3',
      };
    }

    const token = jwt.sign(
      { recordingId: recording.id, purpose: 'assessment-recording-view' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: `${ttl}s` }
    );

    return {
      url: `${env.API_PREFIX}/assessments/recordings/${recording.id}/stream?token=${encodeURIComponent(token)}`,
      expiresInSeconds: ttl,
      mimeType: recording.mimeType,
      recordingType: recording.recordingType,
      provider: 'local',
    };
  }

  async streamRecordingByToken(recordingId: string, token: string) {
    let payload: any;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch {
      throw new AppError('Recording link expired or invalid', 401);
    }
    if (payload?.purpose !== 'assessment-recording-view' || payload?.recordingId !== recordingId) {
      throw new AppError('Unauthorized', 403);
    }

    const recording = await prisma.assessmentRecording.findUnique({ where: { id: recordingId } });
    if (!recording || recording.status !== 'READY') throw new AppError('Recording not found', 404);

    return {
      stream: await objectStorage.getObjectStream(recording.storageKey),
      mimeType: recording.mimeType || 'video/webm',
      fileSize: recording.fileSize,
    };
  }

  async purgeExpiredRecordings() {
    const expired = await prisma.assessmentRecording.findMany({
      where: { expiresAt: { lte: new Date() }, status: { not: 'DELETED' } },
      take: 50,
    });
    for (const rec of expired) {
      try {
        const prefix = rec.storageKey.replace(/\/final(\.webm)?$/, '');
        await objectStorage.deletePrefix(prefix);
        await prisma.assessmentRecording.update({
          where: { id: rec.id },
          data: { status: 'DELETED', storageKey: `${prefix}/deleted` },
        });
        await prisma.assessmentRecordingChunk.deleteMany({ where: { recordingId: rec.id } });
      } catch (err) {
        logger.error(`Failed to purge recording ${rec.id}`, err);
      }
    }
    return { purged: expired.length };
  }
}

export default new RecordingsService();
