import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/api/jobs';
import { api } from '@/api/axios';
import { designationService } from '@/services/master.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ArrowLeft, X, Loader2 } from 'lucide-react';

interface MasterItem { id: string; name: string }

type SkillPick = { skillId: string; name: string; isRequired: boolean };

type JdSnapshot = {
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  skillsKey: string;
};

function skillsKey(skills: SkillPick[]) {
  return skills
    .map((s) => `${s.skillId}:${s.isRequired ? 1 : 0}`)
    .sort()
    .join('|');
}

const fieldClass =
  'h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 disabled:opacity-50';
const textareaClass =
  'w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#111827] resize-none focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25';
const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

function toSnapshot(
  description: string,
  responsibilities: string,
  requirements: string,
  benefits: string,
  skills: SkillPick[],
): JdSnapshot {
  return {
    description,
    responsibilities,
    requirements,
    benefits,
    skillsKey: skillsKey(skills),
  };
}

export default function JobFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    departmentId: '',
    designationId: '',
    locationId: '',
    employmentTypeId: '',
    experienceLevelId: '',
    description: '',
    responsibilities: '',
    requirements: '',
    benefits: '',
    salaryMin: '',
    salaryMax: '',
    showSalary: false,
    numberOfPositions: 1,
    priority: 'MEDIUM',
    closingDate: '',
    publishToCareers: true,
  });

  const [selectedSkills, setSelectedSkills] = useState<SkillPick[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [templateHint, setTemplateHint] = useState<'loaded' | 'empty' | null>(null);
  const [pendingDesignationId, setPendingDesignationId] = useState<string | null>(null);

  const baselineRef = useRef<JdSnapshot>(toSnapshot('', '', '', '', []));

  // Load masters
  const { data: masters } = useQuery({
    queryKey: ['masters-for-job'],
    queryFn: async () => {
      const [depts, desigs, locs, empTypes, expLevels, skills] = await Promise.all([
        api.get('/masters/departments?limit=100').then((r) => r.data.data as MasterItem[]),
        api.get('/masters/designations?limit=100').then((r) => r.data.data as MasterItem[]),
        api.get('/masters/locations?limit=100').then((r) => r.data.data as MasterItem[]),
        api.get('/masters/employment-types?limit=100').then((r) => r.data.data as MasterItem[]),
        api.get('/masters/experience-levels?limit=100').then((r) => r.data.data as MasterItem[]),
        api.get('/masters/skills?limit=200').then((r) => r.data.data as MasterItem[]),
      ]);
      return { depts, desigs, locs, empTypes, expLevels, skills };
    },
  });

  // Load existing job for edit
  const { data: jobData } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.getById(id!).then((r) => r.data.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (jobData) {
      const skills = jobData.skills.map((s: any) => ({
        skillId: s.skill.id,
        name: s.skill.name,
        isRequired: s.isRequired,
      }));
      setForm({
        title: jobData.title,
        departmentId: jobData.department.id,
        designationId: jobData.designation.id,
        locationId: jobData.location.id,
        employmentTypeId: jobData.employmentType?.id ?? '',
        experienceLevelId: jobData.experienceLevel?.id ?? '',
        description: jobData.description,
        responsibilities: jobData.responsibilities ?? '',
        requirements: jobData.requirements ?? '',
        benefits: jobData.benefits ?? '',
        salaryMin: jobData.salaryMin?.toString() ?? '',
        salaryMax: jobData.salaryMax?.toString() ?? '',
        showSalary: jobData.showSalary,
        numberOfPositions: jobData.numberOfPositions,
        priority: jobData.priority,
        closingDate: jobData.closingDate ? jobData.closingDate.slice(0, 10) : '',
        publishToCareers: jobData.isPublished,
      });
      setSelectedSkills(skills);
      baselineRef.current = toSnapshot(
        jobData.description,
        jobData.responsibilities ?? '',
        jobData.requirements ?? '',
        jobData.benefits ?? '',
        skills,
      );
      setTemplateHint(null);
    }
  }, [jobData]);

  const applyTemplate = async (designationId: string) => {
    if (!designationId) return;
    setLoadingTemplate(true);
    try {
      const desig = await designationService.getById(designationId);
      const skills: SkillPick[] = ((desig as any).skills ?? []).map((s: any) => ({
        skillId: s.skill?.id ?? s.skillId,
        name: s.skill?.name ?? '',
        isRequired: s.isRequired ?? true,
      }));

      const description = String((desig as any).defaultDescription ?? '');
      const responsibilities = String((desig as any).defaultResponsibilities ?? '');
      const requirements = String((desig as any).defaultRequirements ?? '');
      const benefits = String((desig as any).defaultBenefits ?? '');

      setForm((f) => ({
        ...f,
        designationId,
        description,
        responsibilities,
        requirements,
        benefits,
      }));
      setSelectedSkills(skills);
      baselineRef.current = toSnapshot(description, responsibilities, requirements, benefits, skills);

      const hasTemplate = !!(description || responsibilities || requirements || benefits || skills.length);
      setTemplateHint(hasTemplate ? 'loaded' : 'empty');
    } catch {
      toast({ title: 'Could not load designation template', variant: 'destructive' });
      setTemplateHint(null);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const isJdDirty = () => {
    const current = toSnapshot(
      form.description,
      form.responsibilities,
      form.requirements,
      form.benefits,
      selectedSkills,
    );
    const base = baselineRef.current;
    return (
      current.description !== base.description ||
      current.responsibilities !== base.responsibilities ||
      current.requirements !== base.requirements ||
      current.benefits !== base.benefits ||
      current.skillsKey !== base.skillsKey
    );
  };

  const handleDesignationChange = (nextId: string) => {
    if (isEdit) {
      setForm((f) => ({ ...f, designationId: nextId }));
      return;
    }

    if (!nextId) {
      setForm((f) => ({ ...f, designationId: '' }));
      setTemplateHint(null);
      return;
    }

    if (isJdDirty() && (form.description || form.responsibilities || form.requirements || form.benefits || selectedSkills.length)) {
      setPendingDesignationId(nextId);
      return;
    }

    void applyTemplate(nextId);
  };

  const mutation = useMutation({
    mutationFn: (payload: any) => isEdit ? jobsApi.update(id!, payload) : jobsApi.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({
        title: isEdit ? 'Job updated' : (form.publishToCareers ? 'Job published on careers page' : 'Job saved as draft'),
        description: isEdit || form.publishToCareers
          ? undefined
          : 'Click Publish on the job page to show it on Careers.',
      });
      navigate(`/jobs/${res.data.data.id}`);
    },
    onError: (err: any) => {
      const fieldErrors = err.response?.data?.errors as Array<{ field?: string; message?: string }> | undefined;
      const detail = fieldErrors?.length
        ? fieldErrors.map((e) => e.message || e.field).filter(Boolean).join(' · ')
        : err.response?.data?.message;
      toast({ title: 'Could not save job', description: detail ?? 'Something went wrong', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.departmentId || !form.designationId || !form.locationId) {
      toast({ title: 'Missing required fields', description: 'Select department, designation and location.', variant: 'destructive' });
      return;
    }
    if (form.description.trim().length < 10) {
      toast({ title: 'Job overview is too short', description: 'Enter at least 10 characters in Overview.', variant: 'destructive' });
      return;
    }

    mutation.mutate({
      title: form.title.trim(),
      departmentId: form.departmentId,
      designationId: form.designationId,
      locationId: form.locationId,
      employmentTypeId: form.employmentTypeId || undefined,
      experienceLevelId: form.experienceLevelId || undefined,
      description: form.description.trim(),
      responsibilities: form.responsibilities.trim() || undefined,
      requirements: form.requirements.trim() || undefined,
      benefits: form.benefits.trim() || undefined,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      showSalary: form.showSalary,
      numberOfPositions: Number(form.numberOfPositions) || 1,
      priority: form.priority,
      closingDate: form.closingDate || undefined,
      ...(isEdit ? {} : { isPublished: form.publishToCareers }),
      skillIds: selectedSkills
        .filter((s) => s.skillId)
        .map((s) => ({ skillId: s.skillId, isRequired: s.isRequired })),
    });
  };

  const toggleSkill = (skill: MasterItem) => {
    const exists = selectedSkills.find((s) => s.skillId === skill.id);
    if (exists) {
      setSelectedSkills(selectedSkills.filter((s) => s.skillId !== skill.id));
    } else {
      setSelectedSkills([...selectedSkills, { skillId: skill.id, name: skill.name, isRequired: true }]);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]"
          onClick={() => navigate('/jobs')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">{isEdit ? 'Edit Job' : 'Create Job'}</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">
            {isEdit ? 'Update this job opening' : 'Create and publish a new job opening'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className={cardClass}>
          <CardHeader><CardTitle className="text-lg text-[#111827]">Job Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-[#111827]">Job Title *</Label>
              <Input required className={`${fieldClass} mt-1.5`} value={form.title} onChange={set('title')} placeholder="e.g. Senior React Developer" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-[#111827]">Department *</Label>
                <select required className={`${fieldClass} mt-1.5`} value={form.departmentId} onChange={set('departmentId')}>
                  <option value="">Select department</option>
                  {masters?.depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[#111827]">Designation *</Label>
                <select
                  required
                  className={`${fieldClass} mt-1.5`}
                  value={form.designationId}
                  onChange={(e) => handleDesignationChange(e.target.value)}
                  disabled={loadingTemplate}
                >
                  <option value="">Select designation</option>
                  {masters?.desigs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {loadingTemplate && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#64748B]">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading default job description...
                  </p>
                )}
              </div>
              <div>
                <Label className="text-[#111827]">Location *</Label>
                <select required className={`${fieldClass} mt-1.5`} value={form.locationId} onChange={set('locationId')}>
                  <option value="">Select location</option>
                  {masters?.locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[#111827]">Employment Type</Label>
                <select className={`${fieldClass} mt-1.5`} value={form.employmentTypeId} onChange={set('employmentTypeId')}>
                  <option value="">Select type</option>
                  {masters?.empTypes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[#111827]">Experience Level</Label>
                <select className={`${fieldClass} mt-1.5`} value={form.experienceLevelId} onChange={set('experienceLevelId')}>
                  <option value="">Select level</option>
                  {masters?.expLevels.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[#111827]">Priority</Label>
                <select className={`${fieldClass} mt-1.5`} value={form.priority} onChange={set('priority')}>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[#111827]">Number of Positions</Label>
                <Input type="number" min={1} className={`${fieldClass} mt-1.5`} value={form.numberOfPositions} onChange={set('numberOfPositions')} />
              </div>
              <div>
                <Label className="text-[#111827]">Closing Date</Label>
                <Input type="date" className={`${fieldClass} mt-1.5`} value={form.closingDate} onChange={set('closingDate')} />
              </div>
              <div>
                <Label className="text-[#111827]">Min Salary (₹/year)</Label>
                <Input type="number" className={`${fieldClass} mt-1.5`} placeholder="e.g. 600000" value={form.salaryMin} onChange={set('salaryMin')} />
              </div>
              <div>
                <Label className="text-[#111827]">Max Salary (₹/year)</Label>
                <Input type="number" className={`${fieldClass} mt-1.5`} placeholder="e.g. 1200000" value={form.salaryMax} onChange={set('salaryMax')} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#111827]">
              <input type="checkbox" className="h-4 w-4 rounded border-[#E2E8F0] accent-[#FF6B00]" checked={form.showSalary} onChange={set('showSalary')} />
              Show salary range to candidates on career portal
            </label>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-lg text-[#111827]">Job Description</CardTitle>
            {!isEdit && templateHint === 'loaded' && (
              <p className="text-sm text-[#64748B]">
                Default content loaded from the selected designation. You can edit it for this job.
              </p>
            )}
            {!isEdit && templateHint === 'empty' && (
              <p className="text-sm text-[#64748B]">
                No default Job Description template is configured for this designation.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'description', label: 'Overview *', required: true, rows: 6, placeholder: 'Brief overview of the role...' },
              { key: 'responsibilities', label: 'Responsibilities', required: false, rows: 6, placeholder: '• Lead backend development\n• Mentor junior developers...' },
              { key: 'requirements', label: 'Requirements', required: false, rows: 6, placeholder: '• 3+ years of experience\n• Proficiency in React...' },
              { key: 'benefits', label: 'Benefits & Perks', required: false, rows: 4, placeholder: '• Health insurance\n• Work from home 3 days a week...' },
            ].map(({ key, label, required, rows, placeholder }) => (
              <div key={key}>
                <Label className="text-[#111827]">{label}</Label>
                <textarea
                  required={required}
                  rows={rows}
                  className={`${textareaClass} mt-1.5`}
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={set(key)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-lg text-[#111827]">Required Skills</CardTitle>
            <p className="text-sm text-[#64748B]">Click to add. Toggle * to mark as required.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map((s) => (
                  <Badge key={s.skillId} className="cursor-pointer gap-1.5 rounded-full bg-[#FF6B00] pr-1 text-white hover:bg-[#e86000]">
                    <span onClick={() => setSelectedSkills(selectedSkills.map((sk) => sk.skillId === s.skillId ? { ...sk, isRequired: !sk.isRequired } : sk))}>
                      {s.name}{s.isRequired ? ' *' : ''}
                    </span>
                    <X className="h-3 w-3" onClick={() => toggleSkill({ id: s.skillId, name: s.name })} />
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {masters?.skills
                .filter((sk) => !selectedSkills.find((s) => s.skillId === sk.id))
                .map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs text-[#111827] transition-colors hover:border-[#FF6B00] hover:bg-[#FFF7ED] hover:text-[#FF6B00]"
                    onClick={() => toggleSkill(skill)}
                  >
                    + {skill.name}
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>

        {!isEdit && (
          <label className={`flex cursor-pointer items-start gap-3 px-4 py-3 text-sm ${cardClass}`}>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-[#E2E8F0] accent-[#FF6B00]"
              checked={form.publishToCareers}
              onChange={set('publishToCareers')}
            />
            <span>
              <span className="font-medium text-[#111827]">Publish on careers page</span>
              <span className="mt-0.5 block text-[#64748B]">
                If unchecked, the job stays a draft and candidates will not see it.
              </span>
            </span>
          </label>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" className="h-10 rounded-xl border-[#E2E8F0]" onClick={() => navigate('/jobs')}>Cancel</Button>
          <Button
            type="submit"
            disabled={mutation.isPending || loadingTemplate}
            className="h-10 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Job' : form.publishToCareers ? 'Create & Publish' : 'Save as Draft'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={!!pendingDesignationId}
        onClose={() => setPendingDesignationId(null)}
        title="Change designation template?"
        description="Changing the designation will replace the current Job Description content with the selected designation's template."
        confirmLabel="Apply New Template"
        variant="default"
        onConfirm={() => {
          const nextId = pendingDesignationId;
          setPendingDesignationId(null);
          if (nextId) void applyTemplate(nextId);
        }}
      />
    </div>
  );
}
