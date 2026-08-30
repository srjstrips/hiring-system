import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  publicAssessmentsApi,
  type AssessmentIntro,
  type AttemptPayload,
  type AttemptStatus,
  type GateCode,
} from '@/api/publicAssessments';
import {
  ChunkedRecorder,
  mergeCameraAndMic,
  pickSupportedMimeType,
  supportsAssessmentRecording,
} from '@/lib/assessmentRecording';
import { AlertTriangle, Camera, CheckCircle2, Mic, MonitorUp, WifiOff } from 'lucide-react';

type Phase = 'loading' | 'error' | 'intro' | 'device' | 'consent' | 'test' | 'submitted';

type CheckState = 'pending' | 'ready' | 'denied';

function formatTime(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function errorTitle(code?: GateCode) {
  switch (code) {
    case 'INVALID_TOKEN':
    case 'EXPIRED':
      return 'Assessment link is invalid or has expired.';
    case 'UNAVAILABLE':
      return 'Assessment is currently unavailable.';
    case 'COMPLETED':
      return 'Assessment already completed.';
    case 'MAX_ATTEMPTS':
      return 'Maximum assessment attempts reached.';
    default:
      return 'Unable to open assessment.';
  }
}

function cacheKey(token: string, attemptId: string) {
  return `hf-assessment:${token}:${attemptId}`;
}

export default function CandidateAssessmentTakePage() {
  const { secureToken = '' } = useParams<{ secureToken: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorCode, setErrorCode] = useState<GateCode | undefined>();
  const [errorMessage, setErrorMessage] = useState('');
  const [intro, setIntro] = useState<AssessmentIntro | null>(null);
  const [attempt, setAttempt] = useState<AttemptPayload | null>(null);
  const [status, setStatus] = useState<AttemptStatus | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [forcedChoiceAnswers, setForcedChoiceAnswers] = useState<Record<string, { mostId?: string; leastId?: string }>>({});
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [syncWarning, setSyncWarning] = useState('');
  const [mediaWarning, setMediaWarning] = useState('');
  const [uploadWarning, setUploadWarning] = useState('');
  const [camera, setCamera] = useState<CheckState>('pending');
  const [microphone, setMicrophone] = useState<CheckState>('pending');
  const [screen, setScreen] = useState<CheckState>('pending');
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [cameraRecStatus, setCameraRecStatus] = useState<'idle' | 'recording' | 'error' | 'stopped'>('idle');
  const [screenRecStatus, setScreenRecStatus] = useState<'idle' | 'recording' | 'error' | 'stopped'>('idle');
  const [starting, setStarting] = useState(false);
  const [browserUnsupported, setBrowserUnsupported] = useState(false);

  const cameraStream = useRef<MediaStream | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const mergedCamMic = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const cameraRecorder = useRef<ChunkedRecorder | null>(null);
  const screenRecorder = useRef<ChunkedRecorder | null>(null);
  const cameraRecordingId = useRef<string | null>(null);
  const screenRecordingId = useRef<string | null>(null);

  const fail = (err: any) => {
    const code = publicAssessmentsApi.gateCode(err);
    setErrorCode(code);
    setErrorMessage(publicAssessmentsApi.gateMessage(err, errorTitle(code)));
    setPhase('error');
  };

  const stopStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((t) => t.stop());
  };

  const cleanupMedia = useCallback(() => {
    stopStream(mergedCamMic.current);
    stopStream(cameraStream.current);
    stopStream(micStream.current);
    stopStream(screenStream.current);
    mergedCamMic.current = null;
    cameraStream.current = null;
    micStream.current = null;
    screenStream.current = null;
  }, []);

  useEffect(() => () => {
    void cameraRecorder.current?.stop().catch(() => undefined);
    void screenRecorder.current?.stop().catch(() => undefined);
    cleanupMedia();
  }, [cleanupMedia]);

  useEffect(() => {
    setBrowserUnsupported(!supportsAssessmentRecording());
  }, []);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!secureToken) {
      setErrorCode('INVALID_TOKEN');
      setErrorMessage(errorTitle('INVALID_TOKEN'));
      setPhase('error');
      return;
    }
    publicAssessmentsApi
      .getIntro(secureToken)
      .then((res) => {
        setIntro(res.data.data);
        setPhase('intro');
      })
      .catch(fail);
  }, [secureToken]);

  const attachTrackEnded = (stream: MediaStream, label: string) => {
    stream.getTracks().forEach((track) => {
      track.onended = () => {
        if (label === 'Camera') {
          setMediaWarning('Camera recording has stopped. Please restore camera access.');
          setCamera('denied');
          setCameraRecStatus('error');
        } else if (label === 'Microphone') {
          setMediaWarning('Microphone recording has stopped. Please restore microphone access.');
          setMicrophone('denied');
          setCameraRecStatus('error');
        } else {
          setMediaWarning('Screen sharing has stopped. Please restore screen sharing.');
          setScreen('denied');
          setScreenRecStatus('error');
        }
      };
    });
  };

  const requestCamera = async () => {
    try {
      stopStream(cameraStream.current);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStream.current = stream;
      attachTrackEnded(stream, 'Camera');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCamera('ready');
      setMediaWarning('');
    } catch {
      setCamera('denied');
    }
  };

  const requestMicrophone = async () => {
    try {
      stopStream(micStream.current);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.current = stream;
      attachTrackEnded(stream, 'Microphone');
      setMicrophone('ready');
      setMediaWarning('');
    } catch {
      setMicrophone('denied');
    }
  };

  const requestScreen = async () => {
    try {
      stopStream(screenStream.current);
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStream.current = stream;
      attachTrackEnded(stream, 'Screen sharing');
      setScreen('ready');
      setMediaWarning('');
    } catch {
      setScreen('denied');
    }
  };

  const allReady = camera === 'ready' && microphone === 'ready' && screen === 'ready';

  const finalizeRecordings = async () => {
    const cam = cameraRecorder.current;
    const scr = screenRecorder.current;
    cameraRecorder.current = null;
    screenRecorder.current = null;

    try {
      const camStop = cam ? await cam.stop() : { durationSeconds: 0 };
      const scrStop = scr ? await scr.stop() : { durationSeconds: 0 };

      const tasks: Promise<unknown>[] = [];
      if (cameraRecordingId.current) {
        tasks.push(
          publicAssessmentsApi
            .completeRecording(secureToken, cameraRecordingId.current, {
              durationSeconds: camStop.durationSeconds,
              failed: cam?.status === 'error',
              failureReason: cam?.status === 'error' ? 'Camera recording interrupted' : undefined,
            })
            .catch(() => undefined)
        );
      }
      if (screenRecordingId.current) {
        tasks.push(
          publicAssessmentsApi
            .completeRecording(secureToken, screenRecordingId.current, {
              durationSeconds: scrStop.durationSeconds,
              failed: scr?.status === 'error',
              failureReason: scr?.status === 'error' ? 'Screen recording interrupted' : undefined,
            })
            .catch(() => undefined)
        );
      }
      await Promise.race([
        Promise.all(tasks),
        new Promise((r) => setTimeout(r, 20_000)),
      ]);
    } catch {
      // Never block assessment submit on recording finalize errors
    }
  };

  const beginAssessment = async () => {
    if (!allReady || !recordingConsent || starting) return;
    if (!supportsAssessmentRecording()) {
      setBrowserUnsupported(true);
      setMediaWarning(
        'Your browser does not support the required assessment recording features. Please use a supported desktop browser such as Chrome or Edge.'
      );
      return;
    }
    if (!cameraStream.current || !micStream.current || !screenStream.current) return;

    const screenTrack = screenStream.current.getVideoTracks()[0];
    if (!screenTrack || screenTrack.readyState !== 'live') {
      setScreen('denied');
      setMediaWarning('Screen sharing is not active. Please restore screen sharing.');
      setPhase('device');
      return;
    }

    setStarting(true);
    try {
      const res = await publicAssessmentsApi.start(secureToken);
      const data = res.data.data;
      let merged = { ...data.answers };
      try {
        const cached = localStorage.getItem(cacheKey(secureToken, data.attemptId));
        if (cached) merged = { ...merged, ...JSON.parse(cached) };
      } catch {
        /* ignore */
      }

      // Start recording metadata + MediaRecorders (graceful if recording fails)
      try {
        const mime = pickSupportedMimeType();
        const rec = await publicAssessmentsApi.startRecordings(secureToken, {
          attemptId: data.attemptId,
          consent: true,
          cameraMimeType: mime || undefined,
          screenMimeType: mime || undefined,
        });
        cameraRecordingId.current = rec.data.data.camera.id;
        screenRecordingId.current = rec.data.data.screen.id;

        const combined = mergeCameraAndMic(cameraStream.current, micStream.current);
        mergedCamMic.current = combined;

        const camRec = new ChunkedRecorder(
          'camera',
          async (blob, chunkIndex) => {
            await publicAssessmentsApi.uploadRecordingChunk(
              secureToken,
              cameraRecordingId.current!,
              chunkIndex,
              blob
            );
            setUploadWarning('');
            setCameraRecStatus('recording');
          },
          (msg) => {
            setUploadWarning(msg);
            setCameraRecStatus('error');
          },
          15_000,
          rec.data.data.camera.nextChunkIndex ?? 0
        );
        const scrRec = new ChunkedRecorder(
          'screen',
          async (blob, chunkIndex) => {
            await publicAssessmentsApi.uploadRecordingChunk(
              secureToken,
              screenRecordingId.current!,
              chunkIndex,
              blob
            );
            setUploadWarning('');
            setScreenRecStatus('recording');
          },
          (msg) => {
            setUploadWarning(msg);
            setScreenRecStatus('error');
          },
          15_000,
          rec.data.data.screen.nextChunkIndex ?? 0
        );

        cameraRecorder.current = camRec;
        screenRecorder.current = scrRec;
        camRec.start(combined);
        scrRec.start(screenStream.current);
        setCameraRecStatus('recording');
        setScreenRecStatus('recording');
      } catch {
        setUploadWarning(
          'Recording could not be fully initialized. You may continue the assessment; HR may see incomplete recording status.'
        );
        setCameraRecStatus('error');
        setScreenRecStatus('error');
      }

      setAttempt(data);
      setAnswers(merged);
      setForcedChoiceAnswers(data.forcedChoiceAnswers ?? {});
      setRemaining(data.remainingSeconds);
      setCurrentQ(0);
      setPhase('test');
    } catch (err) {
      fail(err);
    } finally {
      setStarting(false);
    }
  };

  const persistLocal = (next: Record<string, string>, attemptId: string) => {
    try {
      localStorage.setItem(cacheKey(secureToken, attemptId), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const saveAnswer = async (questionId: string, optionId: string) => {
    if (!attempt) return;
    const next = { ...answersRef.current, [questionId]: optionId };
    setAnswers(next);
    persistLocal(next, attempt.attemptId);
    try {
      await publicAssessmentsApi.saveAnswer(secureToken, { attemptQuestionId: questionId, selectedOptionId: optionId });
      setSyncWarning('');
    } catch {
      setSyncWarning('Connection issue — answer saved locally and will retry.');
    }
  };

  const saveForcedChoice = async (questionId: string, mostId: string | undefined, leastId: string | undefined) => {
    if (!attempt) return;
    const next = { ...forcedChoiceAnswers, [questionId]: { mostId, leastId } };
    setForcedChoiceAnswers(next);
    try {
      await publicAssessmentsApi.saveAnswer(secureToken, {
        attemptQuestionId: questionId,
        selectedMostId: mostId,
        selectedLeastId: leastId,
      });
      setSyncWarning('');
    } catch {
      setSyncWarning('Connection issue — answer saved locally and will retry.');
    }
  };

  // Autosave retry when back online
  useEffect(() => {
    if (phase !== 'test' || !attempt || offline) return;
    const entries = Object.entries(answers);
    if (!entries.length) return;
    publicAssessmentsApi
      .saveAnswersBatch(
        secureToken,
        entries.map(([attemptQuestionId, selectedOptionId]) => ({ attemptQuestionId, selectedOptionId }))
      )
      .then(() => setSyncWarning(''))
      .catch(() => setSyncWarning('Connection issue — answers pending sync.'));
  }, [offline, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const doSubmit = async (auto = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      // Flush local answers first
      if (attempt) {
        const entries = Object.entries(answersRef.current);
        if (entries.length) {
          await publicAssessmentsApi
            .saveAnswersBatch(
              secureToken,
              entries.map(([attemptQuestionId, selectedOptionId]) => ({ attemptQuestionId, selectedOptionId }))
            )
            .catch(() => undefined);
        }
      }
      // Finalize recordings before marking assessment submitted (never block forever)
      await finalizeRecordings();

      const res = await publicAssessmentsApi.submit(secureToken);
      setStatus(res.data.data);
      if (attempt) localStorage.removeItem(cacheKey(secureToken, attempt.attemptId));
      cleanupMedia();
      setPhase('submitted');
    } catch (err: any) {
      const code = publicAssessmentsApi.gateCode(err);
      if (code === 'COMPLETED') {
        const st = await publicAssessmentsApi.getStatus(secureToken).catch(() => null);
        if (st) setStatus(st.data.data);
        setPhase('submitted');
      } else if (!auto) {
        fail(err);
      }
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
      setShowConfirm(false);
    }
  };

  // Server-aligned countdown
  useEffect(() => {
    if (phase !== 'test' || !attempt) return;
    const tick = () => {
      const ends = new Date(attempt.endsAt).getTime();
      const left = Math.max(0, Math.floor((ends - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) void doSubmit(true);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase, attempt?.endsAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const questions = attempt?.questions ?? [];
  const q = questions[currentQ];

  const isAnswered = (qq: typeof questions[0]) => {
    if (qq.questionType === 'FORCED_CHOICE') {
      const fc = forcedChoiceAnswers[qq.id];
      return !!(fc?.mostId && fc?.leastId);
    }
    return !!answers[qq.id];
  };

  const answeredCount = useMemo(
    () => questions.filter(isAnswered).length,
    [questions, answers, forcedChoiceAnswers] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-muted-foreground">
        Loading assessment...
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <h1 className="text-xl font-semibold">{errorTitle(errorCode)}</h1>
            {errorMessage && errorMessage !== errorTitle(errorCode) && (
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h1 className="text-2xl font-semibold">Assessment Submitted</h1>
            <p className="text-muted-foreground">
              {status?.message || 'Your assessment has been submitted successfully.'}
            </p>
            <div className="text-sm text-left rounded-md border p-4 space-y-2 bg-white">
              <p><span className="text-muted-foreground">Assessment:</span> <span className="font-medium">{status?.assessmentName || intro?.assessmentName}</span></p>
              <p><span className="text-muted-foreground">Status:</span> <span className="font-medium">Submitted</span></p>
            </div>
            <p className="text-sm text-muted-foreground">Your results will be reviewed by the hiring team.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'intro' && intro) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center pt-6">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">HireFlow Assessment</p>
            <h1 className="text-3xl font-bold mt-2">{intro.assessmentName}</h1>
            {intro.description && <p className="text-muted-foreground mt-3 whitespace-pre-wrap">{intro.description}</p>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Duration', value: `${intro.durationMins} Minutes` },
              { label: 'Questions', value: `${intro.questionCount} Questions` },
              { label: 'Passing Score', value: `${intro.passingScore}%` },
              { label: 'Attempts', value: `${intro.maxAttempts} Attempt${intro.maxAttempts === 1 ? '' : 's'}` },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-semibold mt-1">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Important Instructions</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>Keep camera enabled.</li>
                <li>Keep microphone enabled.</li>
                <li>Allow screen sharing.</li>
                <li>Do not leave the assessment window.</li>
                <li>Complete the assessment within the allotted time.</li>
                <li>Submit the assessment before the timer expires.</li>
                <li>Use a supported desktop or laptop browser.</li>
              </ul>
            </CardContent>
          </Card>
          <div className="flex justify-center pb-10">
            <Button size="lg" onClick={() => setPhase('device')}>
              {intro.hasOpenAttempt ? 'Resume Assessment' : 'START ASSESSMENT'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'device') {
    const CheckRow = ({
      icon: Icon,
      label,
      state,
      onRetry,
    }: {
      icon: typeof Camera;
      label: string;
      state: CheckState;
      onRetry: () => void;
    }) => (
      <div className="flex items-center justify-between gap-3 border rounded-md p-3">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">{label}</p>
            <p className={`text-xs ${state === 'ready' ? 'text-green-600' : state === 'denied' ? 'text-red-600' : 'text-muted-foreground'}`}>
              {state === 'ready'
                ? `✓ ${label} detected and permission granted`
                : state === 'denied'
                  ? `✕ ${label} access required`
                  : 'Waiting for permission...'}
            </p>
          </div>
        </div>
        {state !== 'ready' && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            {state === 'denied' ? 'Retry' : `Allow ${label}`}
          </Button>
        )}
      </div>
    );

    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Ready to Begin</CardTitle>
            <p className="text-sm text-muted-foreground">Complete all device checks before starting the timer.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <video ref={videoRef} muted playsInline className="w-full h-40 rounded-md bg-black object-cover" />
            <CheckRow icon={Camera} label="Camera" state={camera} onRetry={requestCamera} />
            <CheckRow icon={Mic} label="Microphone" state={microphone} onRetry={requestMicrophone} />
            <CheckRow icon={MonitorUp} label="Screen Sharing" state={screen} onRetry={requestScreen} />
            {mediaWarning && <p className="text-sm text-amber-700">{mediaWarning}</p>}
            {allReady ? (
              <p className="text-sm text-green-700">All checks passed. Continue to recording consent.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Grant camera, microphone, and screen sharing to continue.</p>
            )}
            {browserUnsupported && (
              <p className="text-sm text-amber-800">
                Your browser does not support the required assessment recording features. Please use a supported desktop browser such as Chrome or Edge.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPhase('intro')}>Back</Button>
              <Button disabled={!allReady || browserUnsupported} onClick={() => setPhase('consent')}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'consent') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Recording & Privacy Notice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              During this assessment, your camera, microphone and shared screen will be recorded for assessment
              verification and recruitment review. Recordings are stored securely and may be reviewed by authorized
              HR/recruitment personnel.
            </p>
            <label className="flex items-start gap-3 text-sm border rounded-md p-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={recordingConsent}
                onChange={(e) => setRecordingConsent(e.target.checked)}
              />
              <span>I understand and consent to recording.</span>
            </label>
            {mediaWarning && <p className="text-sm text-amber-700">{mediaWarning}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPhase('device')}>Back</Button>
              <Button disabled={!recordingConsent || starting} onClick={beginAssessment}>
                {starting ? 'Starting...' : 'Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Test phase
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="font-semibold">{attempt?.assessmentName}</h1>
          <p className="text-xs text-muted-foreground">
            Question {currentQ + 1} of {questions.length} · Answered {answeredCount}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-[11px] text-muted-foreground leading-tight">
            <p>Recording active</p>
            <p>Camera: {cameraRecStatus === 'recording' ? '● Recording' : '⚠ Not recording'}</p>
            <p>Screen: {screenRecStatus === 'recording' ? '● Recording' : '⚠ Not recording'}</p>
          </div>
          <div className={`font-mono text-lg font-bold ${remaining <= 60 ? 'text-red-600' : 'text-slate-800'}`}>
            {formatTime(remaining)}
          </div>
        </div>
      </header>

      {(offline || syncWarning || mediaWarning || uploadWarning) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
          {offline && <WifiOff className="h-4 w-4" />}
          {offline
            ? 'You are offline. Answers are saved locally.'
            : mediaWarning || uploadWarning || syncWarning}
        </div>
      )}

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
        <Card>
          <CardContent className="pt-6 pb-6 space-y-6">
            {q && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Question {currentQ + 1} of {questions.length}</p>
                  <h2 className="text-lg font-medium whitespace-pre-wrap">{q.questionText}</h2>
                  {q.marks > 0 && <p className="text-xs text-muted-foreground mt-1">Marks: {q.marks}</p>}
                </div>

                {/* ── Forced-choice tetrad (HEXACO) ── */}
                {q.questionType === 'FORCED_CHOICE' && (() => {
                  const fc = forcedChoiceAnswers[q.id] ?? {};
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-center">
                        <span className="text-[#b45309]">MOST like me</span>
                        <span className="text-slate-500">LEAST like me</span>
                      </div>
                      {q.options.map((opt) => {
                        const label = opt.optionText.replace(/\s*\[[A-Z]+\]$/, '');
                        const isMost  = fc.mostId  === opt.id;
                        const isLeast = fc.leastId === opt.id;
                        return (
                          <div key={opt.id} className={`flex items-center gap-3 border rounded-md p-3 ${isMost ? 'border-[#FF6B00] bg-[#FFF7ED]' : isLeast ? 'border-slate-400 bg-slate-50' : ''}`}>
                            <input
                              type="radio"
                              name={`${q.id}-most`}
                              checked={isMost}
                              title="Most like me"
                              onChange={() => {
                                const newMost = isMost ? undefined : opt.id;
                                const newLeast = fc.leastId === opt.id ? undefined : fc.leastId;
                                void saveForcedChoice(q.id, newMost, newLeast);
                              }}
                              className="accent-[#FF6B00]"
                            />
                            <span className="flex-1 text-sm">{label}</span>
                            <input
                              type="radio"
                              name={`${q.id}-least`}
                              checked={isLeast}
                              title="Least like me"
                              onChange={() => {
                                const newLeast = isLeast ? undefined : opt.id;
                                const newMost = fc.mostId === opt.id ? undefined : fc.mostId;
                                void saveForcedChoice(q.id, newMost, newLeast);
                              }}
                              className="accent-slate-500"
                            />
                          </div>
                        );
                      })}
                      <p className="text-xs text-muted-foreground">Select one statement that is <strong>most</strong> like you (left column) and one that is <strong>least</strong> like you (right column).</p>
                    </div>
                  );
                })()}

                {/* ── Standard MCQ / SJT ── */}
                {q.questionType !== 'FORCED_CHOICE' && q.questionType !== 'TEXT' && (
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const label = opt.optionText.replace(/^\d\s*-\s*/, '');
                      const selected = answers[q.id] === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-3 border rounded-md p-3 cursor-pointer ${selected ? 'border-[#FF6B00] bg-[#FFF7ED]' : 'hover:bg-slate-50'}`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={selected}
                            onChange={() => saveAnswer(q.id, opt.id)}
                            className="mt-1 accent-[#FF6B00]"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ((i) => i - 1)}>
                Previous
              </Button>
              {currentQ < questions.length - 1 ? (
                <Button onClick={() => setCurrentQ((i) => i + 1)}>Next</Button>
              ) : (
                <Button onClick={() => setShowConfirm(true)}>Submit Assessment</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Questions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((qq, i) => {
                const answered = isAnswered(qq);
                const current = i === currentQ;
                return (
                  <button
                    key={qq.id}
                    type="button"
                    onClick={() => setCurrentQ(i)}
                    className={`h-9 rounded text-xs font-medium border ${
                      current
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                        : answered
                          ? 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]'
                          : 'bg-white text-slate-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <Button className="w-full mt-4" variant="outline" onClick={() => setShowConfirm(true)}>
              Submit Assessment
            </Button>
          </CardContent>
        </Card>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-base">Submit Assessment?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You have answered {answeredCount} of {questions.length} questions.
                Once submitted, you cannot change your answers.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={submitting}>Cancel</Button>
                <Button onClick={() => doSubmit(false)} disabled={submitting}>
                  {submitting ? 'Finalizing & submitting...' : 'Submit Assessment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
