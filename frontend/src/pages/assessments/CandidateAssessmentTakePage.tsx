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
import { AlertTriangle, Camera, CheckCircle2, Mic, MonitorUp, WifiOff } from 'lucide-react';

type Phase = 'loading' | 'error' | 'intro' | 'device' | 'test' | 'submitted';

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
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [syncWarning, setSyncWarning] = useState('');
  const [mediaWarning, setMediaWarning] = useState('');
  const [camera, setCamera] = useState<CheckState>('pending');
  const [microphone, setMicrophone] = useState<CheckState>('pending');
  const [screen, setScreen] = useState<CheckState>('pending');
  const [starting, setStarting] = useState(false);

  const cameraStream = useRef<MediaStream | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

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
    stopStream(cameraStream.current);
    stopStream(micStream.current);
    stopStream(screenStream.current);
    cameraStream.current = null;
    micStream.current = null;
    screenStream.current = null;
  }, []);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

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
        setMediaWarning(`${label} has stopped. Please restore it to continue.`);
        if (label === 'Camera') setCamera('denied');
        if (label === 'Microphone') setMicrophone('denied');
        if (label === 'Screen sharing') setScreen('denied');
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

  const beginAssessment = async () => {
    if (!allReady || starting) return;
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
      setAttempt(data);
      setAnswers(merged);
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
      await publicAssessmentsApi.saveAnswer(secureToken, questionId, optionId);
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
  const answeredCount = useMemo(
    () => questions.filter((qq) => answers[qq.id]).length,
    [questions, answers]
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
              <p className="text-sm text-green-700">All checks passed. You can now begin your assessment.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Grant camera, microphone, and screen sharing to continue.</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPhase('intro')}>Back</Button>
              <Button disabled={!allReady || starting} onClick={beginAssessment}>
                {starting ? 'Starting...' : 'Begin Assessment'}
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
        <div className={`font-mono text-lg font-bold ${remaining <= 60 ? 'text-red-600' : 'text-slate-800'}`}>
          {formatTime(remaining)}
        </div>
      </header>

      {(offline || syncWarning || mediaWarning) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
          {offline && <WifiOff className="h-4 w-4" />}
          {offline ? 'You are offline. Answers are saved locally.' : syncWarning || mediaWarning}
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
                  <p className="text-xs text-muted-foreground mt-1">Marks: {q.marks}</p>
                </div>
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 border rounded-md p-3 cursor-pointer ${selected ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={selected}
                          onChange={() => saveAnswer(q.id, opt.id)}
                          className="mt-1"
                        />
                        <span className="text-sm">{opt.optionText}</span>
                      </label>
                    );
                  })}
                </div>
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
                const answered = !!answers[qq.id];
                const current = i === currentQ;
                return (
                  <button
                    key={qq.id}
                    type="button"
                    onClick={() => setCurrentQ(i)}
                    className={`h-9 rounded text-xs font-medium border ${
                      current
                        ? 'bg-blue-600 text-white border-blue-600'
                        : answered
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
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
                  {submitting ? 'Submitting...' : 'Submit Assessment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
