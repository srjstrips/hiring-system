/** Safe MediaRecorder helpers for assessment proctoring (chunked upload). */

export type RecorderKind = 'camera' | 'screen';
export type RecordingStatusState = 'idle' | 'recording' | 'error' | 'stopped';

const PREFERRED_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp8',
  'video/webm',
];

export function supportsAssessmentRecording() {
  return (
    typeof window !== 'undefined' &&
    !!window.MediaRecorder &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!navigator.mediaDevices?.getDisplayMedia
  );
}

export function pickSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

type ChunkHandler = (blob: Blob, chunkIndex: number) => Promise<void>;

export class ChunkedRecorder {
  private recorder: MediaRecorder | null = null;
  private chunkIndex = 0;
  private startedAt: number | null = null;
  private queue: Promise<void> = Promise.resolve();
  private pendingUploads = 0;
  status: RecordingStatusState = 'idle';
  mimeType = '';

  constructor(
    private kind: RecorderKind,
    private onChunk: ChunkHandler,
    private onError: (message: string) => void,
    private timesliceMs = 15_000,
    startChunkIndex = 0
  ) {
    this.chunkIndex = startChunkIndex;
  }

  start(stream: MediaStream) {
    if (this.recorder) return;
    const mimeType = pickSupportedMimeType();
    this.mimeType = mimeType;
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, options);
    } catch {
      // Fallback without mimeType
      recorder = new MediaRecorder(stream);
    }
    this.recorder = recorder;
    this.startedAt = Date.now();
    this.status = 'recording';

    recorder.ondataavailable = (ev) => {
      if (!ev.data || ev.data.size === 0) return;
      const index = this.chunkIndex++;
      this.pendingUploads += 1;
      this.queue = this.queue
        .then(async () => {
          let attempt = 0;
          while (attempt < 4) {
            try {
              await this.onChunk(ev.data, index);
              return;
            } catch {
              attempt += 1;
              await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
          }
          this.status = 'error';
          this.onError(
            this.kind === 'camera'
              ? 'Camera recording upload temporarily unavailable — retrying'
              : 'Screen recording upload temporarily unavailable — retrying'
          );
        })
        .catch(() => undefined)
        .finally(() => {
          this.pendingUploads = Math.max(0, this.pendingUploads - 1);
        });
    };

    recorder.onerror = () => {
      this.status = 'error';
      this.onError(
        this.kind === 'camera'
          ? 'Camera recording has stopped. Please restore camera access.'
          : 'Screen recording has stopped. Please restore screen sharing.'
      );
    };

    recorder.start(this.timesliceMs);
  }

  async stop() {
    const recorder = this.recorder;
    if (!recorder) return { durationSeconds: 0 };
    this.recorder = null;

    await new Promise<void>((resolve) => {
      if (recorder.state === 'inactive') {
        resolve();
        return;
      }
      recorder.onstop = () => resolve();
      try {
        if (recorder.state === 'recording') recorder.requestData();
        recorder.stop();
      } catch {
        resolve();
      }
    });

    await this.queue;
    let wait = 0;
    while (this.pendingUploads > 0 && wait < 40) {
      await new Promise((r) => setTimeout(r, 500));
      wait += 1;
    }

    this.status = this.status === 'error' ? 'error' : 'stopped';
    const durationSeconds = this.startedAt
      ? Math.max(0, Math.round((Date.now() - this.startedAt) / 1000))
      : 0;
    return { durationSeconds };
  }
}

export function mergeCameraAndMic(camera: MediaStream, mic: MediaStream) {
  const tracks: MediaStreamTrack[] = [];
  camera.getVideoTracks().forEach((t) => tracks.push(t));
  mic.getAudioTracks().forEach((t) => tracks.push(t));
  return new MediaStream(tracks);
}
