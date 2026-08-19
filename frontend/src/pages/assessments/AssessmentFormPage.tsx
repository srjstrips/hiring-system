import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi } from '@/api/assessments';
import { api } from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { ArrowLeft } from 'lucide-react';

const emptyForm = {
  name: '',
  description: '',
  jobId: '',
  designationId: '',
  durationMins: '30',
  passingScore: '60',
  maxAttempts: '1',
  startAt: '',
  endAt: '',
  status: 'DRAFT',
};

const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
const fieldClass =
  'h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25';
const textareaClass =
  'w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#111827] resize-none focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25';
const selectClass = fieldClass;
const labelClass = 'mb-1.5 block text-xs font-medium text-[#64748B]';
const errorClass = 'mt-1 text-xs text-rose-600';

function toLocalInput(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoOrUndefined(value: string) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export default function AssessmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-assessment'],
    queryFn: () => api.get('/jobs?limit=200').then((r) => r.data.data),
  });

  const { data: designations } = useQuery({
    queryKey: ['designations-for-assessment'],
    queryFn: () => api.get('/masters/designations?limit=200').then((r) => r.data.data),
  });

  const { data: existing } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => assessmentsApi.getById(id!).then((r) => r.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    const jobIdFromQuery = searchParams.get('jobId');
    if (jobIdFromQuery && !isEdit) {
      setForm((f) => ({ ...f, jobId: jobIdFromQuery }));
    }
  }, [searchParams, isEdit]);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        description: existing.description ?? '',
        jobId: existing.jobId,
        designationId: existing.designationId ?? '',
        durationMins: String(existing.durationMins),
        passingScore: String(existing.passingScore),
        maxAttempts: String(existing.maxAttempts ?? 1),
        startAt: toLocalInput(existing.startAt),
        endAt: toLocalInput(existing.endAt),
        status: existing.status,
      });
    }
  }, [existing]);

  useEffect(() => {
    if (!form.jobId || !jobs || isEdit && existing) return;
    const job = jobs.find((j: any) => j.id === form.jobId);
    if (job?.designation?.id) {
      setForm((f) => (f.designationId ? f : { ...f, designationId: job.designation.id }));
    }
  }, [form.jobId, jobs, isEdit, existing]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit ? assessmentsApi.update(id!, payload) : assessmentsApi.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast({ title: isEdit ? 'Assessment updated' : 'Assessment created', variant: 'success' });
      navigate(`/assessments/${res.data.data.id}`);
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Failed to save assessment';
      const details = e.response?.data?.errors;
      if (details && typeof details === 'object') setErrors(details);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const set = (key: keyof typeof emptyForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setForm((f) => {
      if (key === 'jobId') {
        const job = jobs?.find((j: any) => j.id === value);
        return {
          ...f,
          jobId: value,
          designationId: job?.designation?.id ?? f.designationId,
        };
      }
      return { ...f, [key]: value };
    });
    setErrors((err) => ({ ...err, [key]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Assessment name is required';
    if (!form.jobId) next.jobId = 'Job is required';
    if (!form.durationMins || Number(form.durationMins) <= 0) next.durationMins = 'Duration must be greater than 0';
    const pass = Number(form.passingScore);
    if (Number.isNaN(pass) || pass < 0 || pass > 100) next.passingScore = 'Passing score must be between 0 and 100';
    if (!form.maxAttempts || Number(form.maxAttempts) < 1) next.maxAttempts = 'Maximum attempts must be at least 1';
    if (form.startAt && form.endAt && new Date(form.endAt) < new Date(form.startAt)) {
      next.endAt = 'End date cannot be earlier than start date';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    saveMutation.mutate({
      name: form.name.trim(),
      description: form.description || undefined,
      jobId: form.jobId,
      designationId: form.designationId || undefined,
      durationMins: Number(form.durationMins),
      passingScore: Number(form.passingScore),
      maxAttempts: Number(form.maxAttempts),
      startAt: toIsoOrUndefined(form.startAt),
      endAt: toIsoOrUndefined(form.endAt),
      status: form.status,
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]"
          asChild
        >
          <Link to={isEdit ? `/assessments/${id}` : '/assessments'} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            {isEdit ? 'Edit Assessment' : 'Create Assessment'}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">Basic information and scheduling</p>
        </div>
      </div>

      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#111827]">Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={labelClass}>Assessment Name *</label>
              <Input
                className={fieldClass}
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Senior Software Engineer Assessment"
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            <div>
              <label className={labelClass}>Description / Instructions</label>
              <textarea
                rows={3}
                className={textareaClass}
                value={form.description}
                onChange={set('description')}
                placeholder="Instructions shown to candidates..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Job *</label>
                <select className={selectClass} value={form.jobId} onChange={set('jobId')} required>
                  <option value="">Select job...</option>
                  {jobs?.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
                {errors.jobId && <p className={errorClass}>{errors.jobId}</p>}
              </div>
              <div>
                <label className={labelClass}>Designation</label>
                <select className={selectClass} value={form.designationId} onChange={set('designationId')}>
                  <option value="">Select...</option>
                  {designations?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-[#111827]">Assessment Settings</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Duration (minutes) *</label>
                  <Input type="number" min="1" className={fieldClass} value={form.durationMins} onChange={set('durationMins')} />
                  {errors.durationMins && <p className={errorClass}>{errors.durationMins}</p>}
                </div>
                <div>
                  <label className={labelClass}>Passing Score (%) *</label>
                  <Input type="number" min="0" max="100" className={fieldClass} value={form.passingScore} onChange={set('passingScore')} />
                  {errors.passingScore && <p className={errorClass}>{errors.passingScore}</p>}
                </div>
                <div>
                  <label className={labelClass}>Maximum Attempts</label>
                  <Input type="number" min="1" className={fieldClass} value={form.maxAttempts} onChange={set('maxAttempts')} />
                  {errors.maxAttempts && <p className={errorClass}>{errors.maxAttempts}</p>}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-[#111827]">Schedule & Status</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Start Date</label>
                  <Input type="datetime-local" className={fieldClass} value={form.startAt} onChange={set('startAt')} />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <Input type="datetime-local" className={fieldClass} value={form.endAt} onChange={set('endAt')} />
                  {errors.endAt && <p className={errorClass}>{errors.endAt}</p>}
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={selectClass} value={form.status} onChange={set('status')}>
                    {['DRAFT', 'ACTIVE', 'CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#E2E8F0] pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-[#E2E8F0] text-[#111827] hover:bg-[#F8FAFC]"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update Assessment' : 'Create Assessment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
