import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requisitionsApi } from '@/api/requisitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { Plus, CheckCircle2, XCircle, X, Search } from 'lucide-react';
import { api } from '@/api/axios';

const APPROVAL_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ON_HOLD: 'bg-gray-100 text-gray-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const emptyForm = {
  departmentId: '', designationId: '', locationId: '',
  experienceLevelId: '', numberOfPositions: '1',
  salaryMin: '', salaryMax: '', priority: 'MEDIUM',
  targetDate: '', jobDescription: '',
};

export default function RequisitionsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['requisitions', statusFilter, search],
    queryFn: () => requisitionsApi.getAll({ status: statusFilter || undefined, search: search || undefined }).then((r) => r.data),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => api.get('/masters/departments?limit=200').then((r) => r.data.data),
    enabled: showCreate,
  });
  const { data: designations } = useQuery({
    queryKey: ['designations-all'],
    queryFn: () => api.get('/masters/designations?limit=200').then((r) => r.data.data),
    enabled: showCreate,
  });
  const { data: locations } = useQuery({
    queryKey: ['locations-all'],
    queryFn: () => api.get('/masters/locations?limit=200').then((r) => r.data.data),
    enabled: showCreate,
  });
  const { data: expLevels } = useQuery({
    queryKey: ['exp-levels-all'],
    queryFn: () => api.get('/masters/experience-levels?limit=200').then((r) => r.data.data),
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: requisitionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      toast({ title: 'Requisition submitted', variant: 'success' });
      setShowCreate(false);
      setForm(emptyForm);
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

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      numberOfPositions: Number(form.numberOfPositions),
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      experienceLevelId: form.experienceLevelId || undefined,
      targetDate: form.targetDate || undefined,
      jobDescription: form.jobDescription || undefined,
    });
  };

  const requisitions = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manpower Requisitions</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} total requisitions</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> New Requisition</Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">New Manpower Requisition</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Department *</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.departmentId} onChange={set('departmentId')} required>
                    <option value="">Select...</option>
                    {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Designation *</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.designationId} onChange={set('designationId')} required>
                    <option value="">Select...</option>
                    {designations?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Location *</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.locationId} onChange={set('locationId')} required>
                    <option value="">Select...</option>
                    {locations?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">No. of Positions *</label>
                  <Input type="number" min="1" value={form.numberOfPositions} onChange={set('numberOfPositions')} required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.priority} onChange={set('priority')}>
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Salary Min (₹)</label>
                  <Input type="number" value={form.salaryMin} onChange={set('salaryMin')} placeholder="800000" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Salary Max (₹)</label>
                  <Input type="number" value={form.salaryMax} onChange={set('salaryMax')} placeholder="1500000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Submitting...' : 'Submit Requisition'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reject Modal */}
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

      {/* Filters */}
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

      {/* List */}
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
                      <span>·</span>
                      <span>{r.location.name}</span>
                      <span>·</span>
                      <span>{r.numberOfPositions} position{r.numberOfPositions !== 1 ? 's' : ''}</span>
                      {r.salaryMin && r.salaryMax && (
                        <><span>·</span><span>₹{(r.salaryMin / 100000).toFixed(1)}L – ₹{(r.salaryMax / 100000).toFixed(1)}L</span></>
                      )}
                      {r._count.jobs > 0 && <><span>·</span><span className="text-blue-600">{r._count.jobs} job{r._count.jobs !== 1 ? 's' : ''} linked</span></>}
                    </div>
                    {r.targetDate && <p className="text-xs text-muted-foreground mt-0.5">Target: {new Date(r.targetDate).toLocaleDateString()}</p>}
                    {r.rejectionReason && <p className="text-xs text-red-600 mt-1">Rejection reason: {r.rejectionReason}</p>}
                    <p className="text-xs text-muted-foreground mt-1">By {r.createdBy.firstName} {r.createdBy.lastName} · {new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  {r.approvalStatus === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50"
                        onClick={() => approveMutation.mutate(r.id)} disabled={approveMutation.isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50"
                        onClick={() => setRejectId(r.id)}>
                        <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
