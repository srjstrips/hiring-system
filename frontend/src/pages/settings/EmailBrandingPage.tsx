import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailBrandingApi, type EmailBranding } from '@/api/email-branding';
import { toast } from '@/hooks/useToast';
import { Palette, Image, Globe, Building2, FileText, Save, Eye } from 'lucide-react';

export default function EmailBrandingPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['email-branding'],
    queryFn: () => emailBrandingApi.get().then(r => r.data.data),
  });

  const [form, setForm] = useState<Partial<EmailBranding>>({});
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (d: Partial<EmailBranding>) => emailBrandingApi.update(d).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-branding'] });
      toast({ title: 'Branding saved', description: 'Email branding updated successfully.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to save branding.', variant: 'destructive' }),
  });

  const set = (k: keyof EmailBranding, v: string) => setForm(f => ({ ...f, [k]: v }));

  const primary = form.primaryColor || '#b45309';
  const companyName = form.companyName || 'SRJ Group';

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Email Branding</h1>
        <p className="text-muted-foreground mt-1">Customize how your emails look to candidates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORM */}
        <div className="space-y-5">
          {/* Company Name */}
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Building2 className="w-4 h-4" /> Company Details
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Company Name</label>
              <input
                value={form.companyName || ''}
                onChange={e => set('companyName', e.target.value)}
                placeholder="SRJ Group"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Website URL</label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  value={form.websiteUrl || ''}
                  onChange={e => set('websiteUrl', e.target.value)}
                  placeholder="https://srjsteel.in"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Image className="w-4 h-4" /> Logo
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Logo URL</label>
              <input
                value={form.logoUrl || ''}
                onChange={e => set('logoUrl', e.target.value)}
                placeholder="https://yoursite.com/logo.png"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">Use a publicly accessible image URL (PNG, JPG, SVG). Max height 56px recommended.</p>
            </div>
            {form.logoUrl && (
              <div className="border rounded-lg p-3 bg-muted/30 flex items-center justify-center min-h-[64px]">
                <img src={form.logoUrl} alt="Logo preview" className="max-h-14 max-w-[200px] object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Palette className="w-4 h-4" /> Brand Color
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primaryColor || '#b45309'}
                  onChange={e => set('primaryColor', e.target.value)}
                  className="w-12 h-10 rounded-lg border cursor-pointer p-1"
                />
                <input
                  value={form.primaryColor || '#b45309'}
                  onChange={e => set('primaryColor', e.target.value)}
                  placeholder="#b45309"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Used for email header, buttons, and accents.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <FileText className="w-4 h-4" /> Footer Text
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Footer Text</label>
              <textarea
                value={form.footerText || ''}
                onChange={e => set('footerText', e.target.value)}
                placeholder={`© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: primary }}
            >
              <Save className="w-4 h-4" />
              {mutation.isPending ? 'Saving…' : 'Save Branding'}
            </button>
            <button
              onClick={() => setPreview(p => !p)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border bg-background hover:bg-muted"
            >
              <Eye className="w-4 h-4" />
              {preview ? 'Hide Preview' : 'Preview Email'}
            </button>
          </div>
        </div>

        {/* PREVIEW */}
        {preview && (
          <div className="lg:sticky lg:top-6">
            <p className="text-sm font-semibold text-foreground mb-3">Live Preview</p>
            <div className="border rounded-xl overflow-hidden shadow-lg text-[13px]" style={{ fontFamily: 'Arial, sans-serif', background: '#f3f4f6' }}>
              {/* Header */}
              <div style={{ background: `linear-gradient(135deg, ${primary} 0%, ${darken(primary)} 100%)`, padding: '24px 28px', textAlign: 'center' }}>
                {form.logoUrl
                  ? <img src={form.logoUrl} alt={companyName} style={{ maxHeight: 48, maxWidth: 180, objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
                  : <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{companyName}</span>
                }
                <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Hiring &amp; Recruitment</div>
              </div>
              {/* Strip */}
              <div style={{ height: 3, background: `linear-gradient(90deg,${primary},#f59e0b,${primary})` }} />
              {/* Body */}
              <div style={{ background: '#fff', padding: '24px 28px', color: '#1f2937', lineHeight: 1.7 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#111827' }}>Application Received! ✅</h2>
                <p style={{ margin: '0 0 10px' }}>Hello <strong>Candidate Name</strong>,</p>
                <p style={{ margin: '0 0 16px' }}>Thank you for applying to {companyName}. We have received your application.</p>
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 18px', margin: '16px 0' }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13 }}>Application Details</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#374151' }}><span style={{ color: '#6b7280' }}>Position:</span> <strong>Steel Plant Engineer</strong></p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#374151' }}><span style={{ color: '#6b7280' }}>Department:</span> Production</p>
                </div>
                <a href="#" style={{ background: primary, color: '#fff', padding: '10px 22px', textDecoration: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, display: 'inline-block', marginTop: 8 }}>
                  Browse More Jobs
                </a>
              </div>
              {/* Divider */}
              <div style={{ borderTop: '1px solid #e5e7eb', margin: '0 28px' }} />
              {/* Footer */}
              <div style={{ background: '#f9fafb', padding: '14px 28px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#6b7280', fontSize: 11 }}>{form.footerText || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}</p>
                {form.websiteUrl && <p style={{ margin: '3px 0 0', fontSize: 11 }}><a href={form.websiteUrl} style={{ color: primary }}>{form.websiteUrl.replace(/^https?:\/\//, '')}</a></p>}
                <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: 10 }}>Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function darken(hex: string): string {
  try {
    const h = hex.replace('#', '');
    const r = Math.max(0, parseInt(h.slice(0, 2), 16) - 40);
    const g = Math.max(0, parseInt(h.slice(2, 4), 16) - 30);
    const b = Math.max(0, parseInt(h.slice(4, 6), 16) - 20);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch { return hex; }
}
