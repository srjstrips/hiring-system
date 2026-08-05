import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, XCircle, PauseCircle, RotateCcw, UserX } from 'lucide-react';
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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link> / Interviews
        </p>
        <h1 className="text-2xl font-bold">Interview Management</h1>
        <p className="text-muted-foreground mt-1">Track interview lifecycle across rounds and panels.</p>
      </div>

      <SummaryCards
        columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        items={[
          { label: 'Scheduled', value: summary.SCHEDULED ?? 0, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: summary.COMPLETED ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Shortlisted', value: summary.SHORTLISTED ?? 0, icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Rejected', value: summary.REJECTED ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Backout', value: summary.BACKOUT ?? 0, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'On Hold', value: summary.ON_HOLD ?? 0, icon: PauseCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interview Records</CardTitle>
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

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Interviewer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No interviews found</TableCell></TableRow>
                ) : rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.application?.candidate?.firstName} {row.application?.candidate?.lastName}
                    </TableCell>
                    <TableCell>{row.application?.job?.title}</TableCell>
                    <TableCell>{row.application?.job?.department?.name}</TableCell>
                    <TableCell>{row.interviewType?.name ?? row.title}</TableCell>
                    <TableCell>{row.round}</TableCell>
                    <TableCell className="text-xs">
                      {row.interviewersList?.length
                        ? row.interviewersList.map((i: any) => `${i.user.firstName} ${i.user.lastName}`).join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{row.scheduledAt ? format(new Date(row.scheduledAt), 'PPp') : '—'}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">{row.notes ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {row.status === 'SCHEDULED' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: row.id, status: 'COMPLETED' })}>Complete</Button>
                            <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: row.id, status: 'RESCHEDULED' })}>
                              <RotateCcw className="h-3 w-3" />
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
