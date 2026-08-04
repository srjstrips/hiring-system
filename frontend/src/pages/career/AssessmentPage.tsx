import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { careerApi } from '@/api/career';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

type Phase = 'loading' | 'intro' | 'questions' | 'submitted' | 'error';

export default function AssessmentPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get('candidateId') ?? '';
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const questions = attempt?.template?.questions ?? [];

  const handleSubmit = useCallback(async (timedOut = false) => {
    try {
      const answerList = Object.entries(answers).map(([questionId, answerText]) => ({ questionId, answerText }));
      const res = await careerApi.submitAssessment(applicationId!, candidateId, answerList);
      setResult(res.data.data);
      setPhase('submitted');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to submit. Please refresh and try again.');
      setPhase('error');
    }
  }, [applicationId, candidateId, answers]);

  // Timer
  useEffect(() => {
    if (phase !== 'questions' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, handleSubmit]);

  const startAssessment = async () => {
    try {
      setPhase('loading');
      const res = await careerApi.startAssessment(applicationId!, candidateId);
      setAttempt(res.data.data);
      setTimeLeft((res.data.data.template?.durationMins ?? 30) * 60);
      setPhase('questions');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to start assessment');
      setPhase('error');
    }
  };

  const loadIntro = async () => {
    try {
      const res = await careerApi.startAssessment(applicationId!, candidateId);
      if (res.data.data.submittedAt) {
        setResult(res.data.data);
        setPhase('submitted');
      } else {
        setAttempt(res.data.data);
        if (res.data.data.startedAt) {
          // Already started — resume
          setTimeLeft((res.data.data.template?.durationMins ?? 30) * 60);
          setPhase('questions');
        } else {
          setPhase('intro');
        }
      }
    } catch {
      setPhase('intro');
    }
  };

  useEffect(() => {
    if (!applicationId || !candidateId) { setPhase('error'); setError('Invalid assessment link'); return; }
    loadIntro();
  }, [applicationId, candidateId]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerColor = timeLeft < 300 ? 'text-destructive' : timeLeft < 600 ? 'text-orange-500' : 'text-foreground';

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => navigate('/careers/jobs')}>Back to Jobs</Button>
      </div>
    );
  }

  if (phase === 'submitted') {
    const isPassed = result?.isPassed;
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${isPassed ? 'bg-green-100' : 'bg-orange-100'}`}>
          <CheckCircle2 className={`h-10 w-10 ${isPassed ? 'text-green-600' : 'text-orange-500'}`} />
        </div>
        <h1 className="text-2xl font-bold">{isPassed ? 'Congratulations!' : 'Assessment Submitted'}</h1>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="text-4xl font-bold">{result?.score ?? 0}%</div>
            <Badge variant={isPassed ? 'default' : 'secondary'} className="text-base px-4 py-1">
              {isPassed ? 'Passed' : 'Did not pass'}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {isPassed
                ? 'Your application is now under review. We\'ll contact you within 3-5 business days.'
                : 'Thank you for attempting the assessment. Our team will still review your profile.'}
            </p>
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => navigate('/careers/jobs')}>Browse More Jobs</Button>
      </div>
    );
  }

  if (phase === 'intro') {
    const template = attempt?.template;
    return (
      <div className="max-w-lg mx-auto px-4 py-20 space-y-6">
        <h1 className="text-2xl font-bold">Assessment</h1>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">{template?.title}</h2>
            {template?.description && <p className="text-muted-foreground text-sm">{template.description}</p>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="font-semibold text-lg">{template?.durationMins ?? 30} min</div>
                <div className="text-muted-foreground">Duration</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="font-semibold text-lg">{template?.passingScore ?? 60}%</div>
                <div className="text-muted-foreground">Passing Score</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                <div className="font-semibold text-lg">{questions.length}</div>
                <div className="text-muted-foreground">Questions</div>
              </div>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>The timer starts when you click Start</li>
              <li>You can navigate between questions</li>
              <li>Your answers auto-submit when time runs out</li>
            </ul>
            <Button className="w-full" size="lg" onClick={startAssessment}>Start Assessment</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Questions phase
  const q = questions[currentQ];
  const answered = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold">{attempt?.template?.title}</h1>
          <p className="text-sm text-muted-foreground">{answered} of {questions.length} answered</p>
        </div>
        <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timerColor}`}>
          <Clock className="h-5 w-5" />
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {questions.map((_: any, i: number) => (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i === currentQ ? 'bg-primary' : answers[questions[i]?.id] ? 'bg-primary/40' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      {q && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base leading-relaxed">
                Q{currentQ + 1}. {q.questionText}
              </CardTitle>
              <Badge variant="outline" className="shrink-0">{q.marks} mark{q.marks > 1 ? 's' : ''}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {q.questionType === 'MCQ' && Array.isArray(q.options) && (
              <div className="space-y-2">
                {(q.options as string[]).filter(Boolean).map((opt: string, i: number) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      answers[q.id] === opt ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.questionType === 'TRUE_FALSE' && (
              <div className="flex gap-3">
                {['True', 'False'].map((v) => (
                  <label
                    key={v}
                    className={`flex items-center gap-3 flex-1 p-4 rounded-lg border cursor-pointer transition-colors ${
                      answers[q.id] === v ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <input type="radio" name={`q-${q.id}`} value={v} checked={answers[q.id] === v} onChange={() => setAnswers((a) => ({ ...a, [q.id]: v }))} />
                    <span className="font-medium">{v}</span>
                  </label>
                ))}
              </div>
            )}

            {q.questionType === 'TEXT' && (
              <textarea
                rows={5}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                placeholder="Type your answer here..."
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(currentQ - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        {currentQ < questions.length - 1 ? (
          <Button onClick={() => setCurrentQ(currentQ + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={() => handleSubmit()}
            disabled={answered === 0}
          >
            Submit Assessment ({answered}/{questions.length} answered)
          </Button>
        )}
      </div>
    </div>
  );
}
