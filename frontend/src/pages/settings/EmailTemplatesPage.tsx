import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTemplatesApi, type EmailTemplate } from '@/api/email-templates';
import { toast } from '@/hooks/useToast';
import { Plus, Pencil, Trash2, X, Info, Code, Eye } from 'lucide-react';

const PLACEHOLDERS = [
  '{{candidate_name}}', '{{candidate_first_name}}', '{{candidate_email}}',
  '{{job_title}}', '{{company_name}}', '{{hr_name}}', '{{portal_link}}',
  '{{current_stage}}', '{{stage_name}}',
  '{{assessment_link}}', '{{assessment_name}}', '{{assessment_duration}}',
  '{{interview_date}}', '{{interview_mode}}', '{{interview_location}}',
  '{{meeting_link}}', '{{interview_round}}', '{{interview_title}}', '{{interview_duration}}',
];

/** Category = pipeline stage → email auto-sends when candidate is moved to that stage. */
const STAGE_CATEGORIES = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'SCREENING', label: 'Screening (use {{assessment_link}})' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'INTERVIEW_ROUND_1', label: 'Interview Round 1' },
  { value: 'INTERVIEW_ROUND_2', label: 'Interview Round 2' },
  { value: 'HR_ROUND', label: 'HR Round' },
  { value: 'SELECTED', label: 'Selected' },
  { value: 'OFFER_SENT', label: 'Offer Sent' },
  { value: 'OFFER_ACCEPTED', label: 'Offer Accepted' },
  { value: 'JOINED', label: 'Joined' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'GENERAL', label: 'General (manual send only)' },
];

const emptyForm = { name: '', subject: '', body: '', category: '', description: '' };

const inputCls =
  'h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20';
const selectCls =
  'h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20';
const labelCls = 'mb-2 block text-sm font-medium text-[#334155]';

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplatesApi.getAll().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: emailTemplatesApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['email-templates'] }); toast({ title: 'Template created', variant: 'success' }); setShowForm(false); setForm(emptyForm); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => emailTemplatesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['email-templates'] }); toast({ title: 'Template updated', variant: 'success' }); setEditing(null); setShowForm(false); setForm(emptyForm); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: emailTemplatesApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['email-templates'] }); toast({ title: 'Template deleted' }); },
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject, body: t.body, category: t.category ?? '', description: t.description ?? '' });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, category: form.category || undefined, description: form.description || undefined };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload as any);
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const isPending = createMutation.isPending || updateMutation.isPending;

  // scroll lock for form panel
  useEffect(() => {
    if (!showForm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showForm]);

  return (
    <div className="relative bg-[#F7F9FC] px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px] space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-[22px] font-bold leading-tight text-[#0F172A]">Email Templates</h1>
            <p className="text-sm text-[#64748B]">
              Create one template per pipeline stage. When HR moves a candidate to that stage, the matching template is emailed automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-[44px] items-center gap-2 rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            New Template
          </button>
        </div>

        {/* Inline form card */}
        {showForm && (
          <div className="w-full rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-7 py-5">
              <h2 className="text-[17px] font-semibold text-[#0F172A]">{editing ? 'Edit Template' : 'New Template'}</h2>
              <button type="button" aria-label="Close" onClick={() => setShowForm(false)} className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9]">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="space-y-5 px-7 py-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Template Name <span className="text-[#EF4444]">*</span></label>
                    <input type="text" required value={form.name} onChange={set('name')} placeholder="e.g. Shortlisting Email" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Auto-send on stage</label>
                    <select value={form.category} onChange={set('category')} className={selectCls}>
                      <option value="">None (manual Send Email only)</option>
                      {STAGE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-[#64748B]">
                      Pick a stage to auto-email candidates when they are moved there. Use {'{{assessment_link}}'} for Screening and {'{{meeting_link}}'} / {'{{interview_date}}'} for interview stages.
                    </p>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <input type="text" value={form.description} onChange={set('description')} placeholder="What is this template used for?" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Subject <span className="text-[#EF4444]">*</span></label>
                  <input type="text" required value={form.subject} onChange={set('subject')} placeholder="e.g. Congratulations {{candidate_name}} — Next Steps" className={inputCls} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                    <label className={labelCls + ' mb-0'}>Body <span className="text-[#EF4444]">*</span></label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setShowPlaceholders(!showPlaceholders)} className="flex items-center gap-1 text-xs font-medium text-[#F97316] hover:text-[#EA580C]">
                        <Info className="h-3 w-3" /> Placeholders
                      </button>
                      <div className="flex items-center rounded-[8px] border border-[#E5E7EB] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setHtmlPreview(false)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${!htmlPreview ? 'bg-[#F97316] text-white' : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'}`}
                        >
                          <Code className="h-3 w-3" /> HTML
                        </button>
                        <button
                          type="button"
                          onClick={() => setHtmlPreview(true)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${htmlPreview ? 'bg-[#F97316] text-white' : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'}`}
                        >
                          <Eye className="h-3 w-3" /> Preview
                        </button>
                      </div>
                    </div>
                  </div>
                  {showPlaceholders && (
                    <div className="mb-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                      <p className="mb-2 text-xs text-[#64748B]">Click to copy. Paste into subject or body:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PLACEHOLDERS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(p); toast({ title: `Copied ${p}` }); }}
                            className="rounded-[6px] border border-[#E5E7EB] bg-white px-2 py-0.5 font-mono text-xs text-[#334155] transition-colors hover:border-[#F97316] hover:bg-[#FFF7ED] hover:text-[#EA580C]"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {htmlPreview ? (
                    <div className="w-full min-h-[260px] rounded-[8px] border border-[#E5E7EB] bg-white overflow-auto">
                      {form.body.trim() ? (
                        <iframe
                          srcDoc={form.body}
                          title="Email preview"
                          className="w-full min-h-[260px] border-0"
                          sandbox="allow-same-origin"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[260px] text-[#94A3B8] text-sm">Nothing to preview yet — write some HTML first.</div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      rows={16}
                      required
                      value={form.body}
                      onChange={set('body')}
                      placeholder={`<!-- You can write full HTML here -->\n<h2>Dear {{candidate_name}},</h2>\n<p>Thank you for applying for <strong>{{job_title}}</strong> at {{company_name}}.</p>\n<p><a href="{{portal_link}}">Visit our careers portal</a></p>`}
                      className="w-full resize-y rounded-[8px] border border-[#E5E7EB] bg-[#0F172A] px-3 py-2.5 font-mono text-sm text-[#e2e8f0] outline-none placeholder:text-[#475569] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
                      spellCheck={false}
                    />
                  )}
                  <p className="mt-1.5 text-xs text-[#64748B]">Write plain text or full HTML. Use <code className="bg-[#F1F5F9] px-1 rounded">{'{{placeholders}}'}</code> anywhere. The branded email wrapper (logo, header, footer) is added automatically.</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-[#E5E7EB] px-7 py-5">
                <button type="button" onClick={() => setShowForm(false)} className="inline-flex h-[44px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white px-5 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-60">
                  {isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Templates list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[80px] animate-pulse rounded-[12px] border border-[#E5E7EB] bg-white" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="rounded-[12px] border border-[#E5E7EB] bg-white px-6 py-16 text-center shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <p className="text-4xl mb-3">✉️</p>
            <p className="text-sm font-semibold text-[#0F172A]">No templates yet</p>
            <p className="mt-1 text-sm text-[#64748B]">Create your first email template to start communicating with candidates.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((t) => (
              <div key={t.id} className="rounded-[12px] border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#0F172A]">{t.name}</h3>
                      {t.category && (
                        <span className="inline-flex items-center rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-2.5 py-0.5 text-xs font-medium uppercase text-[#EA580C]">
                          Auto: {t.category.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {t.description && <p className="mt-0.5 text-sm text-[#64748B]">{t.description}</p>}
                    <p className="mt-1 text-sm text-[#64748B]">
                      <span className="font-medium text-[#0F172A]">Subject:</span> {t.subject}
                    </p>
                    <p className="mt-1 line-clamp-2 font-mono text-xs text-[#94A3B8]">{t.body}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => openEdit(t)}
                      className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white text-[#334155] transition-colors hover:bg-[#F8FAFC]"
                    >
                      <Pencil className="h-[16px] w-[16px]" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => deleteMutation.mutate(t.id)}
                      className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white text-[#EF4444] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                    >
                      <Trash2 className="h-[16px] w-[16px]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
