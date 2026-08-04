import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTemplatesApi, type EmailTemplate } from '@/api/email-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/useToast';
import { Plus, Pencil, Trash2, X, Info } from 'lucide-react';

const PLACEHOLDERS = [
  '{{candidate_name}}', '{{candidate_first_name}}', '{{candidate_email}}',
  '{{job_title}}', '{{company_name}}', '{{hr_name}}', '{{portal_link}}',
];

const CATEGORIES = ['GENERAL', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED', 'ONBOARDING'];

const emptyForm = { name: '', subject: '', body: '', category: '', description: '' };

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPlaceholders, setShowPlaceholders] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplatesApi.getAll().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: emailTemplatesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: 'Template created', variant: 'success' });
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => emailTemplatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: 'Template updated', variant: 'success' });
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: emailTemplatesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: 'Template deleted' });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject, body: t.body, category: t.category ?? '', description: t.description ?? '' });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, category: form.category || undefined, description: form.description || undefined };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-sm text-muted-foreground">Reusable templates for candidate communication</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{editing ? 'Edit Template' : 'New Template'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Template Name *</label>
                  <Input value={form.name} onChange={set('name')} placeholder="e.g. Shortlisting Email" required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.category} onChange={set('category')}>
                    <option value="">None</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <Input value={form.description} onChange={set('description')} placeholder="What is this template used for?" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Subject *</label>
                <Input value={form.subject} onChange={set('subject')} placeholder="e.g. Congratulations {{candidate_name}} — Next Steps" required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Body *</label>
                  <button type="button" className="text-xs text-blue-600 flex items-center gap-1" onClick={() => setShowPlaceholders(!showPlaceholders)}>
                    <Info className="h-3 w-3" /> Available placeholders
                  </button>
                </div>
                {showPlaceholders && (
                  <div className="mb-2 p-3 bg-muted/50 rounded-md">
                    <p className="text-xs text-muted-foreground mb-2">Click to copy. Paste into subject or body:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PLACEHOLDERS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(p); toast({ title: `Copied ${p}` }); }}
                          className="px-2 py-0.5 bg-background border rounded text-xs font-mono hover:bg-muted transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <textarea
                  rows={10}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background font-mono resize-y"
                  value={form.body}
                  onChange={set('body')}
                  placeholder={`Dear {{candidate_name}},\n\nThank you for applying for the {{job_title}} position at {{company_name}}.\n\n...`}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p className="text-4xl mb-3">✉️</p>
            <p className="font-medium">No templates yet</p>
            <p className="text-sm mt-1">Create your first email template to start communicating with candidates.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((t) => (
            <Card key={t.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{t.name}</h3>
                      {t.category && <Badge variant="outline">{t.category}</Badge>}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>}
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">Subject:</span> {t.subject}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono">{t.body}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
