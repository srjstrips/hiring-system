import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi, type AssessmentQuestion } from '@/api/assessments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { ArrowLeft, Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, Upload } from 'lucide-react';
import { parseQuestionSheetFile, type RowParseError } from './questionSheetImport';

type OptionForm = { optionText: string; isCorrect: boolean };

const emptyQuestion = () => ({
  questionText: '',
  questionType: 'MCQ',
  marks: '2',
  isActive: true,
  options: [
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
  ] as OptionForm[],
});

export default function AssessmentQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyQuestion());
  const [deleteTarget, setDeleteTarget] = useState<AssessmentQuestion | null>(null);
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<RowParseError[]>([]);

  const { data: assessment } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => assessmentsApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['assessment-questions', id],
    queryFn: () => assessmentsApi.getQuestions(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assessment-questions', id] });
    queryClient.invalidateQueries({ queryKey: ['assessment', id] });
    queryClient.invalidateQueries({ queryKey: ['assessments'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingId
        ? assessmentsApi.updateQuestion(id!, editingId, payload)
        : assessmentsApi.createQuestion(id!, payload),
    onSuccess: () => {
      toast({ title: editingId ? 'Question updated' : 'Question added', variant: 'success' });
      closeForm();
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => assessmentsApi.deleteQuestion(id!, questionId),
    onSuccess: () => {
      toast({ title: 'Question removed' });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => assessmentsApi.reorderQuestions(id!, orderedIds),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyQuestion());
    setFormError('');
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyQuestion());
    setShowForm(true);
  };

  const openEdit = (q: AssessmentQuestion) => {
    setEditingId(q.id);
    const opts =
      q.optionItems?.length
        ? q.optionItems.map((o) => ({ optionText: o.optionText, isCorrect: !!o.isCorrect }))
        : (q.options ?? []).map((text) => ({
            optionText: text,
            isCorrect: q.correctAnswer != null && text === q.correctAnswer,
          }));
    setForm({
      questionText: q.questionText,
      questionType: q.questionType || 'MCQ',
      marks: String(q.marks),
      isActive: q.isActive,
      options: opts.length >= 2 ? opts : emptyQuestion().options,
    });
    setShowForm(true);
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= questions.length) return;
    const ids = questions.map((q) => q.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorderMutation.mutate(ids);
  };

  const setCorrect = (idx: number) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => ({ ...o, isCorrect: i === idx })),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.questionText.trim()) {
      setFormError('Question text is required');
      return;
    }
    if (Number(form.marks) <= 0) {
      setFormError('Marks must be greater than 0');
      return;
    }
    const filled = form.options.filter((o) => o.optionText.trim());
    if (filled.length < 2) {
      setFormError('At least 2 options are required');
      return;
    }
    if (filled.filter((o) => o.isCorrect).length !== 1) {
      setFormError('Exactly one correct answer must be selected');
      return;
    }
    setFormError('');
    saveMutation.mutate({
      questionText: form.questionText.trim(),
      questionType: 'MCQ',
      marks: Number(form.marks),
      isActive: form.isActive,
      options: filled.map((o, i) => ({
        optionText: o.optionText.trim(),
        isCorrect: o.isCorrect,
        displayOrder: i,
      })),
    });
  };

  const handleUploadFile = async (file: File | undefined) => {
    if (!file || !id) return;
    setUploading(true);
    setUploadErrors([]);

    try {
      const parsed = await parseQuestionSheetFile(file);

      if (parsed.questions.length === 0) {
        setUploadErrors(
          parsed.errors.length
            ? parsed.errors
            : [{ row: 0, message: 'No valid questions found in the file.' }]
        );
        toast({
          title: 'Upload failed',
          description: 'Fix the file errors and try again.',
          variant: 'destructive',
        });
        return;
      }

      let imported = 0;
      const apiErrors: RowParseError[] = [...parsed.errors];

      for (let i = 0; i < parsed.questions.length; i++) {
        try {
          await assessmentsApi.createQuestion(id, parsed.questions[i]);
          imported += 1;
        } catch (e: any) {
          apiErrors.push({
            row: i + 1,
            message: e.response?.data?.message || 'Failed to import this question',
          });
        }
      }

      setUploadErrors(apiErrors);
      invalidate();

      if (imported > 0) {
        toast({
          title: `${imported} question${imported === 1 ? '' : 's'} imported`,
          description: apiErrors.length ? `${apiErrors.length} row(s) skipped with errors.` : undefined,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Upload failed',
          description: 'No questions were imported.',
          variant: 'destructive',
        });
      }
    } catch {
      setUploadErrors([{ row: 0, message: 'Could not read the file. Check the format and try again.' }]);
      toast({ title: 'Upload failed', description: 'Could not read the file.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/assessments/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Manage Questions</h1>
            <p className="text-sm text-muted-foreground">{assessment?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(e) => handleUploadFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Questions'}
          </Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Question</Button>
        </div>
      </div>

      {uploadErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-red-700">Upload validation errors</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setUploadErrors([])}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700/90 mb-2">
              Expected columns: question, option1, option2, option3, option4, correctAnswer, marks (type optional, default MCQ).
            </p>
            <ul className="space-y-1 text-sm text-red-700 max-h-40 overflow-y-auto">
              {uploadErrors.map((err, i) => (
                <li key={`${err.row}-${i}`}>
                  {err.row > 0 ? `Row ${err.row}: ` : ''}
                  {err.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{editingId ? 'Edit Question' : 'Add Question'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={closeForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Question Text *</label>
                <textarea
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  value={form.questionText}
                  onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Question Type</label>
                  <Input value="Multiple Choice (MCQ)" disabled />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Marks *</label>
                  <Input
                    type="number"
                    min="1"
                    value={form.marks}
                    onChange={(e) => setForm((f) => ({ ...f, marks: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'ACTIVE' }))}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground block">Options * (select correct answer)</label>
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={opt.isCorrect}
                      onChange={() => setCorrect(idx)}
                      className="accent-primary"
                    />
                    <Input
                      value={opt.optionText}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          options: f.options.map((o, i) => (i === idx ? { ...o, optionText: e.target.value } : o)),
                        }))
                      }
                    />
                    {form.options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      options: [...f.options, { optionText: '', isCorrect: false }],
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Option
                </Button>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Question' : 'Add Question'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p className="font-medium">No questions yet</p>
            <p className="text-sm mt-1">Add MCQ questions for this assessment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q, index) => {
            const opts = q.optionItems?.length
              ? q.optionItems.map((o) => o.optionText)
              : (q.options ?? []);
            return (
              <Card key={q.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-semibold">Question {index + 1}</h3>
                        <Badge variant="secondary">MCQ</Badge>
                        <Badge variant={q.isActive ? 'default' : 'secondary'}>
                          {q.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{opts.length} options · Marks: {q.marks}</span>
                      </div>
                      <p className="text-sm mb-3">{q.questionText}</p>
                      <div className="space-y-1">
                        {opts.map((text, i) => (
                          <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full border border-muted-foreground/40" />
                            {text}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => move(index, 1)} disabled={index === questions.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(q)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteTarget(q)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete question"
        description="If this question has historical answers it will be deactivated instead of permanently deleted."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
