import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { env } from '@/config/env';
import recordingsService from './recordings.service';
import type {
  CompleteRecordingDto,
  RecordingEventDto,
  StartRecordingsDto,
} from './recordings.validator';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (env.ASSESSMENT_RECORDING_MAX_CHUNK_MB || 25) * 1024 * 1024 },
});

export const recordingChunkUpload = upload.single('chunk');

function tokenParam(req: Request) {
  return String(req.params['secureToken'] ?? '');
}

class RecordingsController {
  async start(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recordingsService.startRecordings(tokenParam(req), req.body as StartRecordingsDto);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async uploadChunk(req: Request, res: Response, next: NextFunction) {
    try {
      const recordingId = String(req.params['recordingId'] ?? '');
      const chunkIndex = Number(req.body?.chunkIndex);
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'Chunk file is required' });
        return;
      }
      const data = await recordingsService.uploadChunk(
        tokenParam(req),
        recordingId,
        chunkIndex,
        file.buffer,
        file.mimetype
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const recordingId = String(req.params['recordingId'] ?? '');
      const data = await recordingsService.completeRecording(
        tokenParam(req),
        recordingId,
        req.body as CompleteRecordingDto
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async logEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recordingsService.logPublicEvent(tokenParam(req), req.body as RecordingEventDto);
      res.status(201).json({ success: true, data: { id: data.id, eventType: data.eventType } });
    } catch (err) {
      next(err);
    }
  }

  async getViewUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const assessmentId = String(req.params['id'] ?? '');
      const recordingId = String(req.params['recordingId'] ?? '');
      const data = await recordingsService.getViewUrlForHr(recordingId, assessmentId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async stream(req: Request, res: Response, next: NextFunction) {
    try {
      const recordingId = String(req.params['recordingId'] ?? '');
      const token = String(req.query['token'] ?? '');
      const { stream, mimeType, fileSize } = await recordingsService.streamRecordingByToken(
        recordingId,
        token
      );
      res.setHeader('Content-Type', mimeType);
      if (fileSize != null) res.setHeader('Content-Length', String(fileSize));
      res.setHeader('Cache-Control', 'private, no-store');
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
}

export default new RecordingsController();
