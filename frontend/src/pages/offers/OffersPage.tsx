import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offersApi } from '@/api/offers';
import { applicationsApi } from '@/api/applications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { Plus, Send, CheckCircle2, XCircle, X, Search, Gift, MapPin, Calendar, Building2, Trash2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-[#F1F5F9] text-[#64748B]',
  SENT: 'bg-[#FFF7ED] text-[#EA580C]',
  ACCEPTED: 'bg-[#F0FDF4] text-green-700',
  REJECTED: 'bg-[#FFF1F2] text-rose-700',
  EXPIRED: 'bg-[#FFF7ED] text-amber-700',
  WITHDRAWN: 'bg-[#F1F5F9] text-[#64748B]',
};

const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
const fieldClass =
  'h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25';
const selectClass = fieldClass;
const textareaClass =
  'w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#111827] resize-none focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25';
const labelClass = 'mb-1.5 block text-xs font-medium text-[#64748B]';

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
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['offers', search, statusFilter],
    queryFn: () => offersApi.getAll({ search: search || undefined, status: statusFilter || undefined }).then((r) => r.data),
  });

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

  const deleteMutation = useMutation({
    mutationFn: offersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast({ title: 'Offer deleted', variant: 'success' });
      setDeleteId(null);
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Offers</h1>
          <p className="mt-1 text-sm text-[#64748B]">Manage candidate offers and offer letters</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="h-10 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Offer
        </Button>
      </div>

      {showCreate && (
        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base text-[#111827]">New Offer Letter</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]"
              onClick={() => setShowCreate(false)}
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className={labelClass}>Select Candidate (SELECTED stage only) *</label>
                <select className={selectClass} value={form.applicationId} onChange={set('applicationId')} required>
                  <option value="">Choose application...</option>
                  {appsData?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.candidate.firstName} {a.candidate.lastName} — {a.job.title}
                    </option>
                  ))}
                </select>
                {appsData?.length === 0 && (
                  <p className="mt-1.5 text-xs text-[#64748B]">
                    No candidates in SELECTED stage. Move a candidate to SELECTED first.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-[#111827]">Financial Information</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className={labelClass}>CTC (Annual ₹) *</label>
                    <Input type="number" className={fieldClass} value={form.ctc} onChange={set('ctc')} placeholder="1200000" required />
                  </div>
                  <div>
                    <label className={labelClass}>Joining Bonus (₹)</label>
                    <Input type="number" className={fieldClass} value={form.joiningBonus} onChange={set('joiningBonus')} placeholder="50000" />
                  </div>
                  <div>
                    <label className={labelClass}>Joining Date</label>
                    <Input type="date" className={fieldClass} value={form.joiningDate} onChange={set('joiningDate')} />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-[#111827]">Job Information</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className={labelClass}>Designation *</label>
                    <Input className={fieldClass} value={form.designation} onChange={set('designation')} placeholder="Senior Engineer" required />
                  </div>
                  <div>
                    <label className={labelClass}>Department *</label>
                    <Input className={fieldClass} value={form.department} onChange={set('department')} placeholder="Engineering" required />
                  </div>
                  <div>
                    <label className={labelClass}>Location *</label>
                    <Input className={fieldClass} value={form.location} onChange={set('location')} placeholder="Bangalore" required />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Offer Expires On</label>
                <Input type="date" className={`${fieldClass} max-w-xs`} value={form.expiresAt} onChange={set('expiresAt')} />
              </div>

              <div>
                <label className={labelClass}>Terms & Conditions</label>
                <textarea rows={3} className={textareaClass} value={form.terms} onChange={set('terms')} placeholder="Any specific terms..." />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
                <Button type="button" variant="outline" className="h-10 rounded-xl border-[#E2E8F0]" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Offer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[#111827]">Delete Offer?</h3>
            <p className="mt-2 text-sm text-[#64748B]">This will permanently delete the offer letter. This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl border-[#E2E8F0]" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button className="rounded-xl bg-rose-600 text-white hover:bg-rose-700" onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className={`w-full max-w-md ${cardClass}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#111827]">Mark Offer as Rejected</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className={labelClass}>Rejection Reason</label>
                <textarea
                  rows={3}
                  className={textareaClass}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why did the candidate reject?"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="h-10 rounded-xl border-[#E2E8F0]" onClick={() => setRejectId(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  className="h-10 rounded-xl"
                  onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
                  disabled={rejectMutation.isPending}
                >
                  Confirm Rejection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Search candidate or offer no..."
            className="h-10 rounded-xl border-[#E2E8F0] bg-white pl-9 text-[#111827] placeholder:text-[#94A3B8] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/25 focus-visible:ring-offset-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-[#64748B]">Loading...</div>
      ) : offers.length === 0 ? (
        <Card className={cardClass}>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF7ED]">
              <Gift className="h-6 w-6 text-[#FF6B00]" />
            </div>
            <p className="font-semibold text-[#111827]">No offers yet</p>
            <p className="mt-1 text-sm text-[#64748B]">Create an offer for a candidate in SELECTED stage.</p>
            <Button
              className="mt-5 h-10 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Create Offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <Card key={offer.id} className={`${cardClass} transition-shadow hover:shadow-md`}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#111827]">
                        {offer.application.candidate.firstName} {offer.application.candidate.lastName}
                      </h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[offer.status] ?? 'bg-[#F1F5F9] text-[#64748B]'}`}>
                        {offer.status}
                      </span>
                      <span className="font-mono text-xs text-[#64748B]">{offer.offerNumber}</span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#64748B]">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[#FF6B00]" />
                        {offer.application.job.title}
                      </span>
                      <span>{offer.department}</span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#FF6B00]" />
                        {offer.location}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="font-semibold text-green-700">₹{(Number(offer.ctc) / 100000).toFixed(1)}L CTC</span>
                      {offer.joiningBonus && (
                        <span className="text-[#64748B]">+ ₹{(Number(offer.joiningBonus) / 100000).toFixed(1)}L bonus</span>
                      )}
                      {offer.joiningDate && (
                        <span className="flex items-center gap-1 text-[#64748B]">
                          <Calendar className="h-3.5 w-3.5" />
                          Join: {new Date(offer.joiningDate).toLocaleDateString()}
                        </span>
                      )}
                      {offer.expiresAt && (
                        <span className="text-[#64748B]">
                          Expires: {new Date(offer.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[#64748B]">Designation: <span className="text-[#111827]">{offer.designation}</span></p>
                    {offer.rejectionReason && (
                      <p className="text-xs text-rose-600">Reason: {offer.rejectionReason}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                    {offer.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        className="h-9 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
                        onClick={() => sendMutation.mutate(offer.id)}
                        disabled={sendMutation.isPending}
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Send Offer
                      </Button>
                    )}
                    {offer.status === 'SENT' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-xl border-green-200 text-green-700 hover:bg-[#F0FDF4]"
                          onClick={() => acceptMutation.mutate(offer.id)}
                          disabled={acceptMutation.isPending}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Accepted
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-xl border-rose-200 text-rose-700 hover:bg-[#FFF1F2]"
                          onClick={() => setRejectId(offer.id)}
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Rejected
                        </Button>
                      </>
                    )}
                    <span className="text-xs text-[#64748B]">
                      Created {new Date(offer.createdAt).toLocaleDateString()}
                    </span>
                    {['DRAFT', 'REJECTED', 'EXPIRED', 'WITHDRAWN'].includes(offer.status) && (
                      <button
                        type="button"
                        title="Delete offer"
                        className="text-rose-500 hover:text-rose-700"
                        onClick={() => setDeleteId(offer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
