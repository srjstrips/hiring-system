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
      toast({ title: isEdit ? 'Job updated' : 'Job created successfully' });
      navigate(`/jobs/${res.data.data.id}`);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.response?.data?.message ?? 'Something went wrong', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      closingDate: form.closingDate ? new Date(form.closingDate).toISOString() : undefined,
      employmentTypeId: form.employmentTypeId || undefined,
      experienceLevelId: form.experienceLevelId || undefined,
      skillIds: selectedSkills.map((s) => ({ skillId: s.skillId, isRequired: s.isRequired })),
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Job' : 'Create Job'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Job Title *</Label>
              <Input required value={form.title} onChange={set('title')} placeholder="e.g. Senior React Developer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department *</Label>
                <select required className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.departmentId} onChange={set('departmentId')}>
                  <option value="">Select department</option>
                  {masters?.depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Designation *</Label>
                <select
                  required
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.designationId}
                  onChange={(e) => handleDesignationChange(e.target.value)}
                  disabled={loadingTemplate}
                >
                  <option value="">Select designation</option>
                  {masters?.desigs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {loadingTemplate && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading default job description...
                  </p>
                )}
              </div>
              <div>
                <Label>Location *</Label>
                <select required className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.locationId} onChange={set('locationId')}>
                  <option value="">Select location</option>
                  {masters?.locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Employment Type</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.employmentTypeId} onChange={set('employmentTypeId')}>
                  <option value="">Select type</option>
                  {masters?.empTypes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Experience Level</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.experienceLevelId} onChange={set('experienceLevelId')}>
                  <option value="">Select level</option>
                  {masters?.expLevels.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.priority} onChange={set('priority')}>
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Label>Number of Positions</Label>
                <Input type="number" min={1} value={form.numberOfPositions} onChange={set('numberOfPositions')} />
              </div>
              <div>
                <Label>Closing Date</Label>
                <Input type="date" value={form.closingDate} onChange={set('closingDate')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary */}
        <Card>
          <CardHeader><CardTitle>Compensation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Salary (₹/year)</Label>
                <Input type="number" placeholder="e.g. 600000" value={form.salaryMin} onChange={set('salaryMin')} />
              </div>
              <div>
                <Label>Max Salary (₹/year)</Label>
                <Input type="number" placeholder="e.g. 1200000" value={form.salaryMax} onChange={set('salaryMax')} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.showSalary} onChange={set('showSalary')} />
              Show salary range to candidates on career portal
            </label>
          </CardContent>
        </Card>

        {/* JD */}
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
            {!isEdit && templateHint === 'loaded' && (
              <p className="text-sm text-muted-foreground">
                Default content loaded from the selected designation. You can edit it for this job.
              </p>
            )}
            {!isEdit && templateHint === 'empty' && (
              <p className="text-sm text-muted-foreground">
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
                <Label>{label}</Label>
                <textarea
                  required={required}
                  rows={rows}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={set(key)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
            <p className="text-sm text-muted-foreground">Click to add. Toggle * to mark as required.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSkills.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {selectedSkills.map((s) => (
                  <Badge key={s.skillId} variant="default" className="gap-1.5 cursor-pointer pr-1">
                    <span onClick={() => setSelectedSkills(selectedSkills.map((sk) => sk.skillId === s.skillId ? { ...sk, isRequired: !sk.isRequired } : sk))}>
                      {s.name}{s.isRequired ? ' *' : ''}
                    </span>
                    <X className="h-3 w-3" onClick={() => toggleSkill({ id: s.skillId, name: s.name })} />
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2 flex-wrap max-h-48 overflow-y-auto">
              {masters?.skills
                .filter((sk) => !selectedSkills.find((s) => s.skillId === sk.id))
                .map((skill) => (
                  <Badge
                    key={skill.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => toggleSkill(skill)}
                  >
                    + {skill.name}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/jobs')}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending || loadingTemplate}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Job' : 'Create Job'}
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
