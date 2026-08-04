import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { emailTemplatesApi } from '@/api/email-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { X, Send, Eye } from 'lucide-react';

interface Props {
  applicationId: string;
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  onClose: () => void;
}

export default function SendEmailModal({ applicationId, candidateEmail, candidateName, jobTitle, onClose }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [toEmail, setToEmail] = useState(candidateEmail);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);

  const { data: templates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => emailTemplatesApi.getAll().then((r) => r.data.data),
  });

  const selectedTemplate = templates?.find((t) => t.id === selectedId);

  const previewMutation = useMutation({
    mutationFn: () =>
      emailTemplatesApi.sendForApplication(applicationId, { templateId: selectedId, toEmail, previewOnly: true }),
    onSuccess: (res) => setPreview(res.data.data),
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      emailTemplatesApi.sendForApplication(applicationId, { templateId: selectedId, toEmail }),
    onSuccess: (res) => {
      const d = res.data.data;
      if (d.noSmtp) {
        setPreview({ subject: d.subject, body: d.body });
        toast({
          title: 'SMTP not configured',
          description: 'Email content shown below — copy and send manually.',
          variant: 'destructive',
        });
      } else {
        toast({ title: `Email sent to ${d.to}`, variant: 'success' });
        onClose();
      }
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Send Email to {candidateName}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">To</label>
            <Input value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="candidate@email.com" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Select Template</label>
            {!templates?.length ? (
              <p className="text-sm text-muted-foreground">No templates found. <a href="/settings/email-templates" className="text-blue-600 hover:underline">Create one</a>.</p>
            ) : (
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={selectedId}
                onChange={(e) => { setSelectedId(e.target.value); setPreview(null); }}
              >
                <option value="">Choose a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{t.category ? ` (${t.category})` : ''}</option>
                ))}
              </select>
            )}
          </div>

          {selectedTemplate && (
            <div className="rounded-md bg-muted/50 border p-3 space-y-1 text-sm">
              <p><span className="text-muted-foreground text-xs">Subject preview:</span></p>
              <p className="font-medium">{selectedTemplate.subject}</p>
              {selectedTemplate.description && (
                <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
              )}
            </div>
          )}

          {selectedId && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending}>
                <Eye className="h-4 w-4 mr-1.5" /> Preview
              </Button>
              <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !toEmail}>
                <Send className="h-4 w-4 mr-1.5" /> {sendMutation.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          )}

          {/* Preview Panel */}
          {preview && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <p className="text-xs text-muted-foreground">To: <span className="font-medium text-foreground">{toEmail}</span></p>
                <p className="text-xs text-muted-foreground">Subject: <span className="font-medium text-foreground">{preview.subject}</span></p>
              </div>
              <div className="p-4">
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{preview.body}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
