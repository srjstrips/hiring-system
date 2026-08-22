import { useEffect, useRef, useState } from 'react';
import {
  candidateAuthApi,
  type CandidateFullProfile,
  type CandidateCertification,
} from '@/api/career';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, CheckCircle2, FileText, Loader2, Trash2, Upload, UserCircle2 } from 'lucide-react';

type FormState = Record<string, string>;

const toStr = (v: unknown) => (v == null ? '' : String(v));
const optional = <span className="text-xs font-normal text-muted-foreground">(optional)</span>;

const FIELD_KEYS = [
  'firstName', 'lastName', 'phone', 'alternatePhone', 'whatsappNumber', 'candidateType', 'gender',
  'dateOfBirth', 'currentLocation', 'state', 'pincode', 'currentAddress', 'permanentAddress',
  'preferredLocation', 'languagesKnown', 'willingToRelocate', 'highestQualification', 'instituteName',
  'yearOfPassing', 'percentageCgpa', 'certifications', 'currentCompany', 'currentDesignation', 'totalExperience',
  'currentSalary', 'expectedSalary', 'noticePeriodDays', 'linkedinUrl', 'portfolioUrl',
  'profileSummary', 'aadharNumber', 'panNumber',
] as const;

export default function ProfilePage() {
  const [profile, setProfile] = useState<CandidateFullProfile | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [certs, setCerts] = useState<CandidateCertification[]>([]);
  const [uploadingCert, setUploadingCert] = useState(false);
  const resumeRef = useRef<HTMLInputElement>(null);

  const hydrate = (p: CandidateFullProfile) => {
    setProfile(p);
    const next: FormState = {};
    for (const k of FIELD_KEYS) next[k] = toStr((p as any)[k]);
    if (p.dateOfBirth) next.dateOfBirth = String(p.dateOfBirth).slice(0, 10);
    setForm(next);
  };

  useEffect(() => {
    candidateAuthApi
      .getProfile()
      .then(hydrate)
      .catch(() => setError('Could not load your profile.'))
      .finally(() => setLoading(false));
    candidateAuthApi.listCertifications().then(setCerts).catch(() => undefined);
  }, []);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const isFresher = form.candidateType === 'FRESHER';
  const isExperienced = form.candidateType === 'EXPERIENCED';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSavedAt(false);
    try {
      const updated = await candidateAuthApi.updateProfile(form as Partial<CandidateFullProfile> as any);
      hydrate(updated);
      setSavedAt(true);
      setTimeout(() => setSavedAt(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleResume = async (file: File) => {
    setUploadingResume(true);
    setError('');
    try {
      setProfile(await candidateAuthApi.uploadResume(file));
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not upload resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handlePhoto = async (file: File) => {
    setUploadingPhoto(true);
    setError('');
    try {
      setProfile(await candidateAuthApi.uploadPhoto(file));
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCertUpload = async (file: File) => {
    setUploadingCert(true);
    setError('');
    try {
      const created = await candidateAuthApi.uploadCertification(file, file.name.replace(/\.[^.]+$/, ''));
      setCerts((prev) => [created, ...prev]);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not upload certificate. Use PDF, JPG or PNG (max 10MB).');
    } finally {
      setUploadingCert(false);
    }
  };

  const handleCertDelete = async (id: string) => {
    const prev = certs;
    setCerts((c) => c.filter((x) => x.id !== id));
    try {
      await candidateAuthApi.deleteCertification(id);
    } catch (err: any) {
      setCerts(prev);
      setError(err.response?.data?.message ?? 'Could not remove certificate.');
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading your profile…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#111827]">My Profile</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Fill your details once — your applications will auto-fill from here. Just attach or update your resume when you apply.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Account + photo */}
        <Card>
          <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="relative cursor-pointer">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <UserCircle2 className="h-10 w-10 text-muted-foreground" />
                  </span>
                )}
                <span className="absolute -bottom-1 -right-1 rounded-full bg-[#F97316] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {uploadingPhoto ? '…' : 'Edit'}
                </span>
                <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
              </label>
              <div>
                <p className="font-medium">{profile?.firstName} {profile?.lastName}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <p className="text-xs text-muted-foreground">Photograph {optional}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>First Name</Label><Input value={form.firstName} onChange={set('firstName')} /></div>
              <div><Label>Last Name</Label><Input value={form.lastName} onChange={set('lastName')} /></div>
            </div>
            <div>
              <Label>I am a</Label>
              <div className="mt-1 inline-flex rounded-lg border border-[#E5E7EB] bg-white p-0.5">
                {(['FRESHER', 'EXPERIENCED'] as const).map((t) => (
                  <button key={t} type="button"
                    onClick={() => setForm((f) => ({ ...f, candidateType: t }))}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                      form.candidateType === t ? 'bg-[#F97316] text-white' : 'text-[#475569] hover:text-[#111827]'
                    }`}>
                    {t === 'FRESHER' ? 'Fresher' : 'Experienced'}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal */}
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Phone</Label><Input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" /></div>
            <div><Label>WhatsApp Number {optional}</Label><Input type="tel" value={form.whatsappNumber} onChange={set('whatsappNumber')} /></div>
            <div><Label>Alternate Phone {optional}</Label><Input type="tel" value={form.alternatePhone} onChange={set('alternatePhone')} /></div>
            <div><Label>Date of Birth {optional}</Label><Input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></div>
            <div>
              <Label>Gender {optional}</Label>
              <select value={form.gender} onChange={set('gender')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>
            <div><Label>Languages Known {optional}</Label><Input value={form.languagesKnown} onChange={set('languagesKnown')} placeholder="Hindi, English, Marathi" /></div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader><CardTitle className="text-base">Address & Location</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Current Address {optional}</Label><Input value={form.currentAddress} onChange={set('currentAddress')} /></div>
            <div><Label>City</Label><Input value={form.currentLocation} onChange={set('currentLocation')} placeholder="Jalna" /></div>
            <div><Label>State {optional}</Label><Input value={form.state} onChange={set('state')} placeholder="Maharashtra" /></div>
            <div><Label>Pincode {optional}</Label><Input value={form.pincode} onChange={set('pincode')} /></div>
            <div><Label>Preferred Location / Branch {optional}</Label><Input value={form.preferredLocation} onChange={set('preferredLocation')} placeholder="Jalna" /></div>
            <div className="sm:col-span-2"><Label>Permanent Address {optional}</Label><Input value={form.permanentAddress} onChange={set('permanentAddress')} placeholder="If different from current" /></div>
            <div>
              <Label>Willing to Relocate? {optional}</Label>
              <select value={form.willingToRelocate} onChange={set('willingToRelocate')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select…</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader><CardTitle className="text-base">Education (Highest Qualification)</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Highest Qualification</Label><Input value={form.highestQualification} onChange={set('highestQualification')} placeholder="B.E. Mechanical" /></div>
            <div><Label>Institute / University {optional}</Label><Input value={form.instituteName} onChange={set('instituteName')} /></div>
            <div><Label>Year of Passing {optional}</Label><Input type="number" value={form.yearOfPassing} onChange={set('yearOfPassing')} placeholder="2023" /></div>
            <div><Label>Percentage / CGPA {optional}</Label><Input value={form.percentageCgpa} onChange={set('percentageCgpa')} placeholder="8.2 CGPA / 78%" /></div>
            <div className="sm:col-span-2">
              <Label>Certifications / Training {optional}</Label>
              <textarea rows={3} className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="AutoCAD, Six Sigma, SAP, Tally… (one per line or comma-separated)"
                value={form.certifications} onChange={set('certifications')} />
            </div>
          </CardContent>
        </Card>

        {/* Professional — only for Experienced */}
        {isExperienced && (
          <Card>
            <CardHeader><CardTitle className="text-base">Professional Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label>Current / Last Company {optional}</Label><Input value={form.currentCompany} onChange={set('currentCompany')} /></div>
              <div><Label>Current Designation {optional}</Label><Input value={form.currentDesignation} onChange={set('currentDesignation')} /></div>
              <div><Label>Total Experience (years)</Label><Input type="number" min={0} step={0.5} value={form.totalExperience} onChange={set('totalExperience')} /></div>
              <div><Label>Notice Period (days) {optional}</Label><Input type="number" min={0} value={form.noticePeriodDays} onChange={set('noticePeriodDays')} placeholder="30" /></div>
              <div><Label>Current CTC (₹/year) {optional}</Label><Input type="number" value={form.currentSalary} onChange={set('currentSalary')} /></div>
              <div><Label>Expected CTC (₹/year) {optional}</Label><Input type="number" value={form.expectedSalary} onChange={set('expectedSalary')} placeholder="1200000" /></div>
            </CardContent>
          </Card>
        )}

        {isFresher && (
          <Card>
            <CardHeader><CardTitle className="text-base">For Freshers</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label>Expected Stipend / Salary (₹/year) {optional}</Label><Input type="number" value={form.expectedSalary} onChange={set('expectedSalary')} /></div>
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Add internships and academic projects in your profile summary, and upload certificates or awards in the Certifications & Achievements section below.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Links & summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Links & Summary</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>LinkedIn URL {optional}</Label><Input type="url" value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/..." /></div>
            <div><Label>Portfolio URL {optional}</Label><Input type="url" value={form.portfolioUrl} onChange={set('portfolioUrl')} placeholder="https://..." /></div>
            <div className="sm:col-span-2">
              <Label>Profile Summary {optional}</Label>
              <textarea rows={4} className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="A short summary about your experience and strengths…" value={form.profileSummary} onChange={set('profileSummary')} />
            </div>
          </CardContent>
        </Card>

        {/* Resume */}
        <Card>
          <CardHeader><CardTitle className="text-base">Resume</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {profile?.resumeUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-[#F97316]" />
                  <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="font-medium text-[#111827] hover:underline">
                    {profile.resumeOriginalName ?? 'Current resume'}
                  </a>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => resumeRef.current?.click()} disabled={uploadingResume}>
                  {uploadingResume ? 'Uploading…' : 'Replace'}
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:bg-muted/50">
                <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uploadingResume ? 'Uploading…' : 'Upload your resume (PDF, DOC, DOCX)'}</span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx"
                  onChange={(e) => e.target.files?.[0] && handleResume(e.target.files[0])} />
              </label>
            )}
            <input ref={resumeRef} type="file" className="hidden" accept=".pdf,.doc,.docx"
              onChange={(e) => e.target.files?.[0] && handleResume(e.target.files[0])} />
          </CardContent>
        </Card>

        {/* Certifications & achievements */}
        <Card>
          <CardHeader><CardTitle className="text-base">Certifications & Achievements {optional}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Upload certificates, awards or any achievements as PDF or image. Our recruiters can view these along with your profile.
            </p>

            {certs.length > 0 && (
              <ul className="space-y-2">
                {certs.map((cert) => (
                  <li key={cert.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <Award className="h-4 w-4 shrink-0 text-[#F97316]" />
                      {cert.fileUrl ? (
                        <a href={cert.fileUrl} target="_blank" rel="noreferrer" className="truncate font-medium text-[#111827] hover:underline">
                          {cert.name || cert.fileOriginalName || 'Certificate'}
                        </a>
                      ) : (
                        <span className="truncate font-medium text-[#111827]">{cert.name}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCertDelete(cert.id)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove certificate"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:bg-muted/50">
              <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {uploadingCert ? 'Uploading…' : 'Upload a certificate (PDF, JPG, PNG)'}
              </span>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" disabled={uploadingCert}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleCertUpload(e.target.files[0]);
                  e.target.value = '';
                }} />
            </label>
          </CardContent>
        </Card>

        {/* Verification (optional, sensitive) */}
        <Card>
          <CardHeader><CardTitle className="text-base">Verification {optional}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Aadhaar Number {optional}</Label><Input value={form.aadharNumber} onChange={set('aadharNumber')} /></div>
            <div><Label>PAN Number {optional}</Label><Input value={form.panNumber} onChange={set('panNumber')} /></div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              These are optional and used only for background verification if you are selected. By saving, you consent to SRJ storing this information securely for recruitment purposes.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Profile'}
          </Button>
          {savedAt && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
