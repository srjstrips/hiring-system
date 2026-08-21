import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requisitionsApi, type Requisition } from '@/api/requisitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { Plus, CheckCircle2, XCircle, X, Search, Pencil, ClipboardList } from 'lucide-react';
import { api } from '@/api/axios';

const APPROVAL_COLORS: Record<string, string> = {
  PENDING: 'bg-[#FFF7ED] text-[#FF6B00]',
  APPROVED: 'bg-[#F0FDF4] text-green-700',
  REJECTED: 'bg-[#FFF1F2] text-rose-700',
  ON_HOLD: 'bg-[#F1F5F9] text-[#64748B]',
  DRAFT: 'bg-[#F1F5F9] text-[#64748B]',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-[#F1F5F9] text-[#64748B]',
  MEDIUM: 'bg-[#FFF7ED] text-[#EA580C]',
  HIGH: 'bg-[#FFF7ED] text-[#FF6B00]',
  URGENT: 'bg-[#FFF1F2] text-rose-700',
};

const fieldClass =
  'h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 disabled:opacity-50';
const labelClass = 'mb-1 block text-xs font-medium text-[#64748B]';
const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

const RAISED_FROM_OPTIONS = [
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'PLANT', label: 'Plant' },
  { value: 'CORPORATE_HEAD_OFFICE', label: 'Corporate/Head Office' },
  { value: 'MANAGEMENT', label: 'Management' },
  { value: 'OTHER', label: 'Other' },
] as const;

const RAISED_FROM_LABELS: Record<string, string> = Object.fromEntries(
  RAISED_FROM_OPTIONS.map((o) => [o.value, o.label])
);

const emptyForm = {
  departmentId: '',
  subDepartmentId: '',
  designationId: '',
  locationId: '',
  numberOfPositions: '1',
  replacementAvailable: 'NO',
  replacementEmployeeName: '',
  hodName: '',
  raisedFrom: '',
  priority: 'MEDIUM',
  salaryMin: '',
  salaryMax: '',
  experienceLevelId: '',
  targetDate: '',
  jobDescription: '',
  remark: '',
};

function toForm(r: Requisition) {
  return {
    departmentId: r.department.id,
    subDepartmentId: r.subDepartment?.id ?? '',
    designationId: r.designation.id,
    locationId: r.location.id,
    numberOfPositions: String(r.numberOfPositions),
    replacementAvailable: r.replacementAvailable ? 'YES' : 'NO',
    replacementEmployeeName: r.replacementEmployeeName ?? '',
    hodName: r.hodName ?? '',
    raisedFrom: r.raisedFrom ?? '',
    priority: r.priority || 'MEDIUM',
    salaryMin: r.salaryMin != null ? String(r.salaryMin) : '',
    salaryMax: r.salaryMax != null ? String(r.salaryMax) : '',
    experienceLevelId: r.experienceLevel?.id ?? '',
    targetDate: r.targetDate ? r.targetDate.slice(0, 10) : '',
    jobDescription: r.jobDescription ?? '',
    remark: r.remark ?? '',
  };
}

function buildPayload(form: typeof emptyForm) {
  return {
    departmentId: form.departmentId,
    subDepartmentId: form.subDepartmentId || undefined,
    designationId: form.designationId,
    locationId: form.locationId,
    numberOfPositions: Number(form.numberOfPositions),
    replacementAvailable: form.replacementAvailable === 'YES',
    replacementEmployeeName:
      form.replacementAvailable === 'YES' ? (form.replacementEmployeeName || undefined) : undefined,
    hodName: form.hodName || undefined,
    raisedFrom: form.raisedFrom || undefined,
    priority: form.priority,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
    experienceLevelId: form.experienceLevelId || undefined,
    targetDate: form.targetDate || undefined,
    jobDescription: form.jobDescription || undefined,
    remark: form.remark || undefined,
  };
}

export default function RequisitionsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const formOpen = showCreate || !!editingId;

  const { data, isLoading } = useQuery({
    queryKey: ['requisitions', statusFilter, search],
    queryFn: () => requisitionsApi.getAll({ status: statusFilter || undefined, search: search || undefined }).then((r) => r.data),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => api.get('/masters/departments?limit=200').then((r) => r.data.data),
    enabled: formOpen,
  });
  const { data: subDepartments } = useQuery({
    queryKey: ['sub-departments-all', form.departmentId],
    queryFn: () =>
      api
        .get('/masters/sub-departments', {
          params: { limit: 200, departmentId: form.departmentId || undefined, isActive: 'true' },
        })
        .then((r) => r.data.data),
    enabled: formOpen && !!form.departmentId,
  });
  const { data: designations } = useQuery({
    queryKey: ['designations-all'],
    queryFn: () => api.get('/masters/designations?limit=200').then((r) => r.data.data),
    enabled: formOpen,
  });
  const { data: locations } = useQuery({
    queryKey: ['locations-all'],
    queryFn: () => api.get('/masters/locations?limit=200').then((r) => r.data.data),
    enabled: formOpen,
  });
  const { data: expLevels } = useQuery({
    queryKey: ['exp-levels-all'],
    queryFn: () => api.get('/masters/experience-levels?limit=200').then((r) => r.data.data),
    enabled: formOpen,
  });

  const createMutation = useMutation({
    mutationFn: requisitionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      toast({ title: 'Requisition submitted', variant: 'success' });
      closeForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReturnType<typeof buildPayload> }) =>
      requisitionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      toast({ title: 'Requisition updated', variant: 'success' });
      closeForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: requisitionsApi.approve,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['requisitions'] }); toast({ title: 'Requisition approved', variant: 'success' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => requisitionsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      toast({ title: 'Requisition rejected' });
      setRejectId(null);
      setRejectReason('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => {
      if (k === 'departmentId') {
        return { ...f, departmentId: value, subDepartmentId: '' };
      }
      if (k === 'replacementAvailable' && value !== 'YES') {
        return { ...f, replacementAvailable: value, replacementEmployeeName: '' };
      }
      return { ...f, [k]: value };
    });
  };

  const closeForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowCreate(true);
  };

  const openEdit = (r: Requisition) => {
    setShowCreate(false);
    setEditingId(r.id);
    setForm(toForm(r));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload(form);
    if (editingId) updateMutation.mutate({ id: editingId, data: payload });
    else createMutation.mutate(payload);
  };

  const requisitions = data?.data ?? [];
  const saving = createMutation.isPending || updateMutation.isPending;
  const canEdit = (status: string) => ['DRAFT', 'PENDING', 'ON_HOLD'].includes(status);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Manpower Requisitions</h1>
          <p className="mt-1 text-sm text-[#64748B]">{data?.total ?? 0} total requisitions</p>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
        >
          <Plus className="mr-2 h-4 w-4" /> New Requisition
        </Button>
      </div>

      {formOpen && (
        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base text-[#111827]">
              {editingId ? 'Edit Manpower Requisition' : 'New Manpower Requisition'}
            </CardTitle>
            <Button variant="ghost" size="icon" className="text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]" onClick={closeForm}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Department *</label>
                  <select className={fieldClass} value={form.departmentId} onChange={set('departmentId')} required>
                    <option value="">Select...</option>
                    {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Sub Department *</label>
                  <select
                    className={fieldClass}
                    value={form.subDepartmentId}
                    onChange={set('subDepartmentId')}
                    required
                    disabled={!form.departmentId}
                  >
                    <option value="">{form.departmentId ? 'Select...' : 'Select department first'}</option>
                    {subDepartments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Designation *</label>
                  <select className={fieldClass} value={form.designationId} onChange={set('designationId')} required>
                    <option value="">Select...</option>
                    {designations?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Location *</label>
                  <select className={fieldClass} value={form.locationId} onChange={set('locationId')} required>
                    <option value="">Select...</option>
                    {locations?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>No. of Positions *</label>
                  <Input type="number" min="1" className={fieldClass} value={form.numberOfPositions} onChange={set('numberOfPositions')} required />
                </div>
                <div>
                  <label className={labelClass}>Replacement Available</label>
                  <select className={fieldClass} value={form.replacementAvailable} onChange={set('replacementAvailable')}>
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                </div>
              </div>

              {form.replacementAvailable === 'YES' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Replacement Employee Name</label>
                    <Input className={fieldClass} value={form.replacementEmployeeName} onChange={set('replacementEmployeeName')} placeholder="Employee name" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>HOD Name</label>
                  <Input className={fieldClass} value={form.hodName} onChange={set('hodName')} placeholder="Head of Department" />
                </div>
                <div>
                  <label className={labelClass}>Requisition Raised From</label>
                  <select className={fieldClass} value={form.raisedFrom} onChange={set('raisedFrom')}>
                    <option value="">Select...</option>
                    {RAISED_FROM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select className={fieldClass} value={form.priority} onChange={set('priority')}>
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass}>Salary Min (₹)</label>
                  <Input type="number" className={fieldClass} value={form.salaryMin} onChange={set('salaryMin')} placeholder="800000" />
                </div>
                <div>
                  <label className={labelClass}>Salary Max (₹)</label>
                  <Input type="number" className={fieldClass} value={form.salaryMax} onChange={set('salaryMax')} placeholder="1500000" />
                </div>
                <div>
                  <label className={labelClass}>Experience Level</label>
                  <select className={fieldClass} value={form.experienceLevelId} onChange={set('experienceLevelId')}>
                    <option value="">Any</option>
                    {expLevels?.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Target Date</label>
                  <Input type="date" className={fieldClass} value={form.targetDate} onChange={set('targetDate')} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Job Description / Notes</label>
                <textarea rows={3} className={`${fieldClass} h-auto resize-none`} value={form.jobDescription} onChange={set('jobDescription')} placeholder="Describe the role and requirements..." />
              </div>
              <div>
                <label className={labelClass}>Remark</label>
                <textarea rows={2} className={`${fieldClass} h-auto resize-none`} value={form.remark} onChange={set('remark')} placeholder="Additional remarks or comments..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-xl border-[#E2E8F0]" onClick={closeForm}>Cancel</Button>
                <Button type="submit" disabled={saving} className="rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]">
                  {saving ? 'Saving...' : editingId ? 'Update Requisition' : 'Submit Requisition'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className={`w-full max-w-md ${cardClass}`}>
            <CardHeader className="pb-3"><CardTitle className="text-base text-[#111827]">Reject Requisition</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className={labelClass}>Reason for rejection</label>
                <textarea rows={3} className={`${fieldClass} h-auto resize-none`} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this being rejected?" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-xl border-[#E2E8F0]" onClick={() => setRejectId(null)}>Cancel</Button>
                <Button variant="destructive" className="rounded-xl" onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })} disabled={rejectMutation.isPending}>
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-full flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Search..."
            className="h-10 rounded-xl border-[#E2E8F0] bg-white pl-9 text-[#111827] placeholder:text-[#94A3B8] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/25 focus-visible:ring-offset-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          {['PENDING', 'APPROVED', 'REJECTED', 'ON_HOLD'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[#64748B]">Loading...</div>
      ) : requisitions.length === 0 ? (
        <Card className={cardClass}>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7ED]">
              <ClipboardList className="h-5 w-5 text-[#FF6B00]" />
            </div>
            <p className="font-semibold text-[#111827]">No requisitions yet</p>
            <p className="mt-1 text-sm text-[#64748B]">Submit a new manpower requisition to start hiring.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requisitions.map((r) => (
            <Card key={r.id} className={`${cardClass} transition-shadow hover:shadow-md`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#111827]">{r.designation.name}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${APPROVAL_COLORS[r.approvalStatus]}`}>{r.approvalStatus}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                      <span className="font-mono text-xs text-[#64748B]">{r.requisitionNumber}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#64748B]">
                      <span>{r.department.name}</span>
                      {r.subDepartment?.name && <span>{r.subDepartment.name}</span>}
                      <span>{r.location.name}</span>
                      <span>{r.numberOfPositions} position{r.numberOfPositions !== 1 ? 's' : ''}</span>
                      {r.experienceLevel?.name && <span>{r.experienceLevel.name}</span>}
                      {r.targetDate && <span>Target {new Date(r.targetDate).toLocaleDateString()}</span>}
                      {r.salaryMin && r.salaryMax && (
                        <span>₹{(Number(r.salaryMin) / 100000).toFixed(1)}L – ₹{(Number(r.salaryMax) / 100000).toFixed(1)}L</span>
                      )}
                      {r._count.jobs > 0 && (
                        <span className="font-medium text-[#FF6B00]">{r._count.jobs} job{r._count.jobs !== 1 ? 's' : ''} linked</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B]">
                      {r.hodName && <span>HOD: {r.hodName}</span>}
                      {r.raisedFrom && <span>Raised from: {RAISED_FROM_LABELS[r.raisedFrom] ?? r.raisedFrom}</span>}
                      {r.replacementAvailable && (
                        <span>Replacement: {r.replacementEmployeeName || 'Yes'}</span>
                      )}
                    </div>
                    {r.remark && <p className="mt-0.5 text-xs text-[#64748B]">Remark: {r.remark}</p>}
                    {r.rejectionReason && <p className="mt-1 text-xs text-rose-600">Rejection reason: {r.rejectionReason}</p>}
                    <p className="mt-1 text-xs text-[#64748B]">By {r.createdBy.firstName} {r.createdBy.lastName} · {new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {canEdit(r.approvalStatus) && (
                      <Button size="icon" variant="ghost" title="Edit" className="h-9 w-9 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {r.approvalStatus === 'PENDING' && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Approve"
                          className="h-9 w-9 text-green-700 hover:bg-[#F0FDF4]"
                          onClick={() => approveMutation.mutate(r.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Reject"
                          className="h-9 w-9 text-rose-700 hover:bg-[#FFF1F2]"
                          onClick={() => setRejectId(r.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
