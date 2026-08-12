import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requisitionsApi, type Requisition } from '@/api/requisitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { Plus, CheckCircle2, XCircle, X, Search, Pencil } from 'lucide-react';
import { api } from '@/api/axios';

const APPROVAL_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ON_HOLD: 'bg-gray-100 text-gray-700',
  DRAFT: 'bg-slate-100 text-slate-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manpower Requisitions</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} total requisitions</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Requisition</Button>
      </div>

      {formOpen && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {editingId ? 'Edit Manpower Requisition' : 'New Manpower Requisition'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={closeForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Department *</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.departmentId} onChange={set('departmentId')} required>
                    <option value="">Select...</option>
                    {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Sub Department *</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
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
                  <label className="text-xs text-muted-foreground mb-1 block">Designation *</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.designationId} onChange={set('designationId')} required>
                    <option value="">Select...</option>
                    {designations?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Location *</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.locationId} onChange={set('locationId')} required>
                    <option value="">Select...</option>
                    {locations?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">No. of Positions *</label>
                  <Input type="number" min="1" value={form.numberOfPositions} onChange={set('numberOfPositions')} required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Replacement Available</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.replacementAvailable} onChange={set('replacementAvailable')}>
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                </div>
              </div>

              {form.replacementAvailable === 'YES' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Replacement Employee Name</label>
                    <Input value={form.replacementEmployeeName} onChange={set('replacementEmployeeName')} placeholder="Employee name" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">HOD Name</label>
                  <Input value={form.hodName} onChange={set('hodName')} placeholder="Head of Department" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Requisition Raised From</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.raisedFrom} onChange={set('raisedFrom')}>
                    <option value="">Select...</option>
                    {RAISED_FROM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.priority} onChange={set('priority')}>
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Salary Min (₹)</label>
                  <Input type="number" value={form.salaryMin} onChange={set('salaryMin')} placeholder="800000" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Salary Max (₹)</label>
                  <Input type="number" value={form.salaryMax} onChange={set('salaryMax')} placeholder="1500000" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Experience Level</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.experienceLevelId} onChange={set('experienceLevelId')}>
                    <option value="">Any</option>
                    {expLevels?.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Target Date</label>
                  <Input type="date" value={form.targetDate} onChange={set('targetDate')} />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Job Description / Notes</label>
                <textarea rows={3} className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" value={form.jobDescription} onChange={set('jobDescription')} placeholder="Describe the role and requirements..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Remark</label>
                <textarea rows={2} className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" value={form.remark} onChange={set('remark')} placeholder="Additional remarks or comments..." />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Requisition' : 'Submit Requisition'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3"><CardTitle className="text-base">Reject Requisition</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reason for rejection</label>
                <textarea rows={3} className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this being rejected?" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })} disabled={rejectMutation.isPending}>
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['PENDING', 'APPROVED', 'REJECTED', 'ON_HOLD'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : requisitions.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No requisitions yet</p>
          <p className="text-sm mt-1">Submit a new manpower requisition to start hiring.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {requisitions.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{r.designation.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${APPROVAL_COLORS[r.approvalStatus]}`}>{r.approvalStatus}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                      <span className="text-xs text-muted-foreground font-mono">{r.requisitionNumber}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>{r.department.name}</span>
                      {r.subDepartment?.name && (<><span>·</span><span>{r.subDepartment.name}</span></>)}
                      <span>·</span>
                      <span>{r.location.name}</span>
                      <span>·</span>
                      <span>{r.numberOfPositions} position{r.numberOfPositions !== 1 ? 's' : ''}</span>
                      {r.salaryMin && r.salaryMax && (
                        <><span>·</span><span>₹{(Number(r.salaryMin) / 100000).toFixed(1)}L – ₹{(Number(r.salaryMax) / 100000).toFixed(1)}L</span></>
                      )}
                      {r._count.jobs > 0 && <><span>·</span><span className="text-blue-600">{r._count.jobs} job{r._count.jobs !== 1 ? 's' : ''} linked</span></>}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {r.hodName && <span>HOD: {r.hodName}</span>}
                      {r.raisedFrom && <span>Raised from: {RAISED_FROM_LABELS[r.raisedFrom] ?? r.raisedFrom}</span>}
                      {r.replacementAvailable && (
                        <span>
                          Replacement: {r.replacementEmployeeName || 'Yes'}
                        </span>
                      )}
                    </div>
                    {r.remark && <p className="text-xs text-muted-foreground mt-0.5">Remark: {r.remark}</p>}
                    {r.targetDate && <p className="text-xs text-muted-foreground mt-0.5">Target: {new Date(r.targetDate).toLocaleDateString()}</p>}
                    {r.rejectionReason && <p className="text-xs text-red-600 mt-1">Rejection reason: {r.rejectionReason}</p>}
                    <p className="text-xs text-muted-foreground mt-1">By {r.createdBy.firstName} {r.createdBy.lastName} · {new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canEdit(r.approvalStatus) && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                      </Button>
                    )}
                    {r.approvalStatus === 'PENDING' && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => approveMutation.mutate(r.id)} disabled={approveMutation.isPending}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => setRejectId(r.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
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
