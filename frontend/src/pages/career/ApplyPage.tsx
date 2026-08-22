import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { careerApi, candidateAuthApi } from '@/api/career';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Upload, CheckCircle2, Loader2, UserCircle2, FileText } from 'lucide-react';

const toStr = (v: unknown) => (v == null ? '' : String(v));

export default function ApplyPage() {
  const { slug } = useParams<{ slug: string }>();
  const { candidate } = useCandidateAuth();

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [savedResume, setSavedResume] = useState<{ url: string; name?: string } | null>(null);

  const [form, setForm] = useState({
    phone: candidate?.phone ?? '',
    currentCompany: '', currentDesignation: '',
    totalExperience: '', expectedSalary: '', noticePeriodDays: '',
    linkedinUrl: '', coverLetter: '',
  });

  // Auto-fill from the saved candidate profile
  useEffect(() => {
    candidateAuthApi
      .getProfile()
      .then((p) => {
        setForm((f) => ({
          ...f,
          phone: toStr(p.phone) || f.phone,
          currentCompany: toStr(p.currentCompany),
          currentDesignation: toStr(p.currentDesignation),
          totalExperience: toStr(p.totalExperience),
          expectedSalary: toStr(p.expectedSalary),
          noticePeriodDays: toStr(p.noticePeriodDays),
          linkedinUrl: toStr(p.linkedinUrl),
        }));
        if (p.resumeUrl) setSavedResume({ url: p.resumeUrl, name: p.resumeOriginalName ?? undefined });
      })
      .catch(() => {});
  }, []);

  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ['career-job', slug],
    queryFn: () => careerApi.getJob(slug!).then((r) => r.data.data),
    enabled: !!slug,
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (resumeFile) fd.append('resume', resumeFile);

      await careerApi.apply(jobData!.id, fd);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (jobLoading) return <div className="max-w-2xl mx-auto px-4 py-12 text-muted-foreground">Loading...</div>;
  if (!jobData) return <div className="max-w-2xl mx-auto px-4 py-12 text-muted-foreground">Job not found</div>;

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Application Submitted!</h1>
        <p className="text-muted-foreground">
          Your application for <strong>{jobData.title}</strong> has been received.
          A confirmation email has been sent to your inbox. Our HR team will review your
          profile first. If shortlisted, you&apos;ll move through screening and interview
          rounds. We&apos;ll contact you by email at each step.
        </p>
        <Button variant="outline" asChild>
          <Link to="/careers/jobs">Browse More Jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link to="/careers/jobs" className="hover:text-foreground">Jobs</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/careers/jobs/${slug}`} className="hover:text-foreground">{jobData.title}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Apply</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Apply for {jobData.title}</h1>
        <div className="flex gap-2 mt-2">
          <Badge variant="secondary">{jobData.department.name}</Badge>
          <Badge variant="outline">{jobData.location.city}</Badge>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Applying As</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <UserCircle2 className="h-9 w-9 text-muted-foreground" />
              <div>
                <p className="font-medium">{candidate?.firstName} {candidate?.lastName}</p>
                <p className="text-sm text-muted-foreground">{candidate?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" />
            </div>
            <div>
              <Label>LinkedIn URL</Label>
              <Input type="url" value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Professional Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Company</Label>
                <Input value={form.currentCompany} onChange={set('currentCompany')} />
              </div>
              <div>
                <Label>Current Designation</Label>
                <Input value={form.currentDesignation} onChange={set('currentDesignation')} />
              </div>
              <div>
                <Label>Total Experience (years)</Label>
                <Input type="number" min={0} step={0.5} value={form.totalExperience} onChange={set('totalExperience')} />
              </div>
              <div>
                <Label>Expected Salary (₹/year)</Label>
                <Input type="number" value={form.expectedSalary} onChange={set('expectedSalary')} placeholder="1200000" />
              </div>
              <div>
                <Label>Notice Period (days)</Label>
                <Input type="number" min={0} value={form.noticePeriodDays} onChange={set('noticePeriodDays')} placeholder="30" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resume & Cover Letter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Resume (PDF, DOC, DOCX — max 10MB)</Label>
              {savedResume && !resumeFile && (
                <div className="mt-1 mb-2 flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                  <FileText className="h-4 w-4 text-[#F97316]" />
                  <span className="text-muted-foreground">Using your saved resume:</span>
                  <a href={savedResume.url} target="_blank" rel="noreferrer" className="font-medium text-[#111827] hover:underline">
                    {savedResume.name ?? 'resume'}
                  </a>
                </div>
              )}
              <label className="mt-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                {resumeFile ? (
                  <span className="text-sm font-medium">{resumeFile.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {savedResume ? 'Attach a different resume (optional)' : 'Click to upload your resume'}
                  </span>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div>
              <Label>Cover Letter</Label>
              <textarea
                rows={5}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                placeholder="Tell us why you're a great fit for this role..."
                value={form.coverLetter}
                onChange={set('coverLetter')}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : 'Submit Application'}
        </Button>
      </form>
    </div>
  );
}
