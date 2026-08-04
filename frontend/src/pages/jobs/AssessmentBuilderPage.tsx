import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi, type AssessmentQuestion } from '@/api/assessments';
import { jobsApi } from '@/api/jobs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/useToast';
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from 'lucide-react';

type QType = 'MCQ' | 'TEXT' | 'TRUE_FALSE';

interface LocalQuestion {
  id?: string;
  questionText: string;
  questionType: QType;
  options: string[];
  correctAnswer: string;
  marks: number;
  explanation: string;
}

const defaultQuestion = (): LocalQuestion => ({
  questionText: '',
  questionType: 'MCQ',
  options: ['', '', '', ''],
  correctAnswer: '',
  marks: 1,
  explanation: '',
});

export default function AssessmentBuilderPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [templateForm, setTemplateForm] = useState({ title: '', description: '', durationMins: 30, passingScore: 60 });
  const [questions, setQuestions] = useState<LocalQuestion[]>([defaultQuestion()]);
  const [hasTemplate, setHasTemplate] = useState(false);

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.getById(jobId!).then((r) => r.data.data),
    enabled: !!jobId,
  });

  const { data: templateData } = useQuery({
    queryKey: ['assessment-template', jobId],
    queryFn: () => assessmentsApi.getTemplate(jobId!).then((r) => r.data.data),
    enabled: !!jobId,
    retry: false,
  });

  useEffect(() => {
    if (templateData) {
      setHasTemplate(true);
      setTemplateForm({
        title: templateData.title,
        description: templateData.description ?? '',
        durationMins: templateData.durationMins,
        passingScore: templateData.passingScore,
      });
      if (templateData.questions.length > 0) {
        setQuestions(templateData.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: (q.options as string[] | undefined) ?? ['', '', '', ''],
          correctAnswer: q.correctAnswer ?? '',
          marks: q.marks,
          explanation: q.explanation ?? '',
        })));
      }
    }
  }, [templateData]);

  const saveTemplateMutation = useMutation({
    mutationFn: () =>
      hasTemplate
        ? assessmentsApi.updateTemplate(jobId!, templateForm)
        : assessmentsApi.createTemplate({ ...templateForm, jobId }),
    onSuccess: () => {
      setHasTemplate(true);
      queryClient.invalidateQueries({ queryKey: ['assessment-template', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast({ title: 'Assessment settings saved' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const saveQuestionsMutation = useMutation({
    mutationFn: () =>
      assessmentsApi.saveQuestions(
        jobId!,
        questions.map((q, i) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.questionType === 'MCQ' ? q.options.filter(Boolean) : undefined,
          correctAnswer: q.correctAnswer || undefined,
          marks: q.marks,
          orderIndex: i,
          explanation: q.explanation || undefined,
        })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-template', jobId] });
      toast({ title: 'Questions saved successfully' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' }),
  });

  const updateQuestion = (idx: number, patch: Partial<LocalQuestion>) =>
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

  const updateOption = (qIdx: number, optIdx: number, value: string) =>
    setQuestions((qs) =>
      qs.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? value : o) } : q),
    );

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/jobs/${jobId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Assessment Builder</h1>
          <p className="text-sm text-muted-foreground">{job?.title}</p>
        </div>
      </div>

      {/* Template Settings */}
      <Card>
        <CardHeader><CardTitle>Assessment Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Assessment Title *</Label>
              <Input
                value={templateForm.title}
                onChange={(e) => setTemplateForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Technical Screening for React Developer"
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number" min={5} max={180}
                value={templateForm.durationMins}
                onChange={(e) => setTemplateForm((f) => ({ ...f, durationMins: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Passing Score (%)</Label>
              <Input
                type="number" min={0} max={100}
                value={templateForm.passingScore}
                onChange={(e) => setTemplateForm((f) => ({ ...f, passingScore: Number(e.target.value) }))}
              />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <textarea
                rows={2}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                placeholder="Instructions for the candidate..."
                value={templateForm.description}
                onChange={(e) => setTemplateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={() => saveTemplateMutation.mutate()} disabled={!templateForm.title || saveTemplateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {hasTemplate ? 'Update Settings' : 'Create Assessment'}
          </Button>
        </CardContent>
      </Card>

      {/* Questions */}
      {hasTemplate && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Questions</h2>
              <p className="text-sm text-muted-foreground">{questions.length} questions · {totalMarks} total marks</p>
            </div>
            <Button variant="outline" onClick={() => setQuestions([...questions, defaultQuestion()])}>
              <Plus className="h-4 w-4 mr-2" /> Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Q{idx + 1}</span>
                    <div className="flex gap-2 ml-auto">
                      {(['MCQ', 'TEXT', 'TRUE_FALSE'] as QType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => updateQuestion(idx, { questionType: t, options: t === 'MCQ' ? ['', '', '', ''] : [], correctAnswer: '' })}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            q.questionType === t ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {t.replace('_', ' ')}
                        </button>
                      ))}
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                        disabled={questions.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Question *</Label>
                    <textarea
                      rows={2}
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                      value={q.questionText}
                      onChange={(e) => updateQuestion(idx, { questionText: e.target.value })}
                      placeholder="Enter your question..."
                    />
                  </div>

                  {q.questionType === 'MCQ' && (
                    <div className="space-y-2">
                      <Label>Options (mark correct with radio)</Label>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${idx}`}
                            checked={q.correctAnswer === opt && opt !== ''}
                            onChange={() => opt && updateQuestion(idx, { correctAnswer: opt })}
                          />
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(idx, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`}
                          />
                        </div>
                      ))}
                      {q.correctAnswer && <Badge variant="outline" className="text-xs">Correct: {q.correctAnswer}</Badge>}
                    </div>
                  )}

                  {q.questionType === 'TRUE_FALSE' && (
                    <div className="space-y-2">
                      <Label>Correct Answer</Label>
                      <div className="flex gap-4">
                        {['True', 'False'].map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name={`tf-${idx}`} checked={q.correctAnswer === v} onChange={() => updateQuestion(idx, { correctAnswer: v })} />
                            {v}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.questionType === 'TEXT' && (
                    <p className="text-xs text-muted-foreground">Text answers will be manually reviewed.</p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Marks</Label>
                      <Input
                        type="number" min={1}
                        value={q.marks}
                        onChange={(e) => updateQuestion(idx, { marks: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Explanation (shown after submit)</Label>
                      <Input
                        value={q.explanation}
                        onChange={(e) => updateQuestion(idx, { explanation: e.target.value })}
                        placeholder="Optional explanation..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={() => saveQuestionsMutation.mutate()}
              disabled={saveQuestionsMutation.isPending || questions.some((q) => !q.questionText)}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveQuestionsMutation.isPending ? 'Saving...' : `Save ${questions.length} Questions`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
