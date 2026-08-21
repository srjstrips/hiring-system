import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, XCircle, PauseCircle, RotateCcw, UserX, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SummaryCards } from '@/components/common/SummaryCards';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { interviewsApi } from '@/api/dashboard';
import { departmentService, interviewTypeService } from '@/services/master.service';
import { exportToCsv } from '@/utils/exportCsv';
import { toast } from '@/hooks/useToast';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  'SCHEDULED', 'COMPLETED', 'SHORTLISTED', 'REJECTED', 'BACKOUT', 'ON_HOLD', 'RESCHEDULED',
].map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));

export default function InterviewDashboardPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const params = useMemo(() => ({
    page,
    limit: 10,
    search: search || undefined,
    departmentId: filters.departmentId || undefined,
    interviewTypeId: filters.interviewTypeId || undefined,
    status: filters.status || undefined,
    round: filters.round || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }), [page, search, filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['interviews', params],
    queryFn: () => interviewsApi.getAll(params),
  });

  const { data: summaryRes } = useQuery({
    queryKey: ['interviews-summary', filters],
    queryFn: () => interviewsApi.getSummary({
      departmentId: filters.departmentId || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }),
  });

  const { data: departments = [] } = useQuery({ queryKey: ['dept-active'], queryFn: () => departmentService.getAllActive() });
  const { data: interviewTypes = [] } = useQuery({ queryKey: ['itype-active'], queryFn: () => interviewTypeService.getAllActive() });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => interviewsApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews-summary'] });
      toast({ title: 'Interview status updated', variant: 'success' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const rows = data?.data ?? [];
  const summary = summaryRes?.data ?? {};
  const pagination = data?.pagination;

  const setFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="mb-1 text-sm text-[#64748B]">
          <Link to="/dashboard" className="text-[#FF6B00] hover:underline">Dashboard</Link> / Interviews
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Interview Management</h1>
        <p className="mt-1 text-sm text-[#64748B]">Track interview lifecycle across rounds and panels.</p>
      </div>

      <SummaryCards
        columns="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
        items={[
          { label: 'Scheduled', value: summary.SCHEDULED ?? 0, icon: Calendar, color: 'text-[#FF6B00]', bg: 'bg-[#FFF7ED]' },
          { label: 'Completed', value: summary.COMPLETED ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-[#F0FDF4]' },
          { label: 'Shortlisted', value: summary.SHORTLISTED ?? 0, icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-[#F5F3FF]' },
          { label: 'Rejected', value: summary.REJECTED ?? 0, icon: XCircle, color: 'text-rose-600', bg: 'bg-[#FFF1F2]' },
          { label: 'Backout', value: summary.BACKOUT ?? 0, icon: UserX, color: 'text-rose-600', bg: 'bg-[#FFF1F2]' },
          { label: 'On Hold', value: summary.ON_HOLD ?? 0, icon: PauseCircle, color: 'text-[#FF6B00]', bg: 'bg-[#FFF7ED]' },
        ]}
      />

      <Card className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <CardTitle className="text-base text-[#111827]">Interview Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={(v) => { setPage(1); setSearch(v); }}
            values={filters}
            onChange={setFilter}
            onClear={() => { setFilters({}); setSearch(''); setPage(1); }}
            onExport={() => exportToCsv('interviews', rows.map((r: any) => ({
              Candidate: `${r.application?.candidate?.firstName} ${r.application?.candidate?.lastName}`,
              Position: r.application?.job?.title,
              Department: r.application?.job?.department?.name,
              Type: r.interviewType?.name,
              Round: r.round,
              Mode: r.mode === 'IN_PERSON' ? 'In person' : 'Video',
              MeetingLink: r.meetingLink ?? '',
              Location: r.location ?? '',
              Interviewer: r.interviewersList?.map((i: any) => `${i.user.firstName} ${i.user.lastName}`).join('; '),
              Date: r.scheduledAt,
              Status: r.status,
              Remarks: r.notes,
            })))}
            filters={[
              { key: 'departmentId', label: 'Department', options: departments.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'interviewTypeId', label: 'Interview Type', options: interviewTypes.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'round', label: 'Round', options: [
                { value: '1', label: 'Round 1' },
                { value: '2', label: 'Round 2' },
                { value: '3', label: 'Technical / Final' },
              ]},
              { key: 'status', label: 'Status', options: STATUS_OPTIONS },
              { key: 'dateFrom', label: 'From', type: 'date' },
              { key: 'dateTo', label: 'To', type: 'date' },
            ]}
          />

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                  <TableHead className="font-medium text-[#64748B]">Candidate</TableHead>
                  <TableHead className="font-medium text-[#64748B]">Position</TableHead>
                  <TableHead className="font-medium text-[#64748B]">Department</TableHead>
                  <TableHead className="font-medium text-[#64748B]">Type</TableHead>
                  <TableHead className="font-medium text-[#64748B]">Round</TableHead>
                  <TableHead className="font-medium text-[#64748B]">Mode</TableHead>
                  <TableHead className="font-medium text-[#64748B]">Interviewer</TableHead>
                  <TableHead className="font-medium text-[#64748B]">Date</TableHead>
                  <TableHead className="font-medium text-[#64748B]">Status</TableHead>
                  <TableHead className="font-medium text-[#64748B]">Remarks</TableHead>
                  <TableHead className="font-medium text-[#64748B]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={11} className="py-10 text-center text-sm text-[#64748B]">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-16 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7ED]">
                        <Calendar className="h-5 w-5 text-[#FF6B00]" />
                      </div>
                      <p className="font-semibold text-[#111827]">No interviews found</p>
                      <p className="mt-1 text-sm text-[#64748B]">Try adjusting search or filters.</p>
                    </TableCell>
                  </TableRow>
                ) : rows.map((row: any) => (
                  <TableRow key={row.id} className="border-[#E2E8F0] hover:bg-[#FFF7ED]/40">
                    <TableCell className="font-medium text-[#111827]">
                      {row.application?.candidate?.firstName} {row.application?.candidate?.lastName}
                    </TableCell>
                    <TableCell className="text-[#111827]">{row.application?.job?.title}</TableCell>
                    <TableCell className="text-[#64748B]">{row.application?.job?.department?.name}</TableCell>
                    <TableCell className="text-[#64748B]">{row.interviewType?.name ?? row.title}</TableCell>
                    <TableCell className="text-[#111827]">{row.round}</TableCell>
                    <TableCell className="text-xs text-[#64748B]">
                      {row.mode === 'IN_PERSON' ? 'In person' : 'Video'}
                    </TableCell>
                    <TableCell className="text-xs text-[#64748B]">
                      {row.interviewersList?.length
                        ? row.interviewersList.map((i: any) => `${i.user.firstName} ${i.user.lastName}`).join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-[#64748B]">{row.scheduledAt ? format(new Date(row.scheduledAt), 'PPp') : '—'}</TableCell>
                    <TableCell><StatusBadge status={row.status} className="rounded-full" /></TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-[#64748B]">{row.notes ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {row.mode !== 'IN_PERSON' && (row.meetingToken || row.meetingLink) && (
                          <Button size="icon" variant="ghost" title="Join video call" aria-label="Join video call" className="h-8 w-8 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]" asChild>
                            <a
                              href={row.meetingToken ? `/interview/call/${row.meetingToken}?as=hr` : row.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Video className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {row.status === 'SCHEDULED' && (
                          <>
                            <Button size="icon" variant="ghost" title="Complete" aria-label="Mark interview complete" className="h-8 w-8 text-[#64748B] hover:bg-[#F0FDF4] hover:text-green-700" onClick={() => statusMutation.mutate({ id: row.id, status: 'COMPLETED' })}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Reschedule" aria-label="Mark interview rescheduled" className="h-8 w-8 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]" onClick={() => statusMutation.mutate({ id: row.id, status: 'RESCHEDULED' })}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </CardContent>
      </Card>
    </div>
  );
}
