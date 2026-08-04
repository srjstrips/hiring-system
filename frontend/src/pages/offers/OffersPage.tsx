import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offersApi } from '@/api/offers';
import { applicationsApi } from '@/api/applications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { Plus, Send, CheckCircle2, XCircle, X, Search } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-yellow-100 text-yellow-700',
  WITHDRAWN: 'bg-gray-100 text-gray-700',
};

const emptyForm = {
  applicationId: '', ctc: '', joiningBonus: '',
  joiningDate: '', designation: '', department: '',
  location: '', terms: '', expiresAt: '',
};

export default function OffersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['offers', search, statusFilter],
    queryFn: () => offersApi.getAll({ search: search || undefined, status: statusFilter || undefined }).then((r) => r.data),
  });

  // Load SELECTED applications for dropdown
  const { data: appsData } = useQuery({
    queryKey: ['applications-selected'],
    queryFn: () => applicationsApi.getAll({ status: 'SELECTED', limit: 100 }).then((r) => r.data.data),
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: offersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast({ title: 'Offer created', variant: 'success' });
      setShowCreate(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const sendMutation = useMutation({
    mutationFn: offersApi.send,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['offers'] }); toast({ title: 'Offer sent to candidate', variant: 'success' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const acceptMutation = useMutation({
    mutationFn: offersApi.accept,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['offers'] }); toast({ title: 'Offer marked as accepted', variant: 'success' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => offersApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast({ title: 'Offer marked as rejected' });
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
      ctc: Number(form.ctc),
      joiningBonus: form.joiningBonus ? Number(form.joiningBonus) : undefined,
      joiningDate: form.joiningDate || undefined,
      expiresAt: form.expiresAt || undefined,
    });
  };

  const offers = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offers</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} total offers</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Create Offer</Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">New Offer Letter</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Select Candidate (SELECTED stage only) *</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.applicationId} onChange={set('applicationId')} required>
                  <option value="">Choose application...</option>
                  {appsData?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.candidate.firstName} {a.candidate.lastName} — {a.job.title}
                    </option>
                  ))}
                </select>
                {appsData?.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No candidates in SELECTED stage. Move a candidate to SELECTED first.</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">CTC (Annual ₹) *</label>
                  <Input type="number" value={form.ctc} onChange={set('ctc')} placeholder="1200000" required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Joining Bonus (₹)</label>
                  <Input type="number" value={form.joiningBonus} onChange={set('joiningBonus')} placeholder="50000" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Joining Date</label>
                  <Input type="date" value={form.joiningDate} onChange={set('joiningDate')} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Designation *</label>
                  <Input value={form.designation} onChange={set('designation')} placeholder="Senior Engineer" required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Department *</label>
                  <Input value={form.department} onChange={set('department')} placeholder="Engineering" required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Location *</label>
                  <Input value={form.location} onChange={set('location')} placeholder="Bangalore" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Offer Expires On</label>
                  <Input type="date" value={form.expiresAt} onChange={set('expiresAt')} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Terms & Conditions</label>
                <textarea rows={3} className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" value={form.terms} onChange={set('terms')} placeholder="Any specific terms..." />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Offer'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mark Offer as Rejected</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rejection Reason</label>
                <textarea rows={3} className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why did the candidate reject?" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })} disabled={rejectMutation.isPending}>
                  Confirm Rejection
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
          <Input placeholder="Search candidate or offer no..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : offers.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <p className="text-4xl mb-3">🎁</p>
          <p className="font-medium">No offers yet</p>
          <p className="text-sm mt-1">Create an offer for a candidate in SELECTED stage.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <Card key={offer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">
                        {offer.application.candidate.firstName} {offer.application.candidate.lastName}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[offer.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {offer.status}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">{offer.offerNumber}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {offer.application.job.title} · {offer.designation} · {offer.location}
                    </p>
                    <div className="flex gap-4 mt-1.5 text-sm">
                      <span className="font-semibold text-green-700">₹{(Number(offer.ctc) / 100000).toFixed(1)}L CTC</span>
                      {offer.joiningBonus && <span className="text-muted-foreground">+ ₹{(Number(offer.joiningBonus) / 100000).toFixed(1)}L bonus</span>}
                      {offer.joiningDate && <span className="text-muted-foreground">Join: {new Date(offer.joiningDate).toLocaleDateString()}</span>}
                    </div>
                    {offer.rejectionReason && <p className="text-xs text-red-600 mt-1">Reason: {offer.rejectionReason}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {offer.status === 'DRAFT' && (
                      <Button size="sm" onClick={() => sendMutation.mutate(offer.id)} disabled={sendMutation.isPending}>
                        <Send className="h-3.5 w-3.5 mr-1.5" /> Send Offer
                      </Button>
                    )}
                    {offer.status === 'SENT' && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => acceptMutation.mutate(offer.id)} disabled={acceptMutation.isPending}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Accepted
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => setRejectId(offer.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1.5" /> Rejected
                        </Button>
                      </>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(offer.createdAt).toLocaleDateString()}
                    </div>
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
