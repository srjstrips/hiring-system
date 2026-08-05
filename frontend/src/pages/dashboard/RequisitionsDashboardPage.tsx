import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SummaryCards } from '@/components/common/SummaryCards';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { requisitionsApi } from '@/api/requisitions';
import { departmentService } from '@/services/master.service';
import { exportToCsv } from '@/utils/exportCsv';
import { buildPagination } from '@/utils/buildPagination';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CLOSED', 'ON_HOLD']
  .map((s) => ({ value: s, label: s === 'PENDING' ? 'Pending Approval' : s.replace(/_/g, ' ') }));

export default function RequisitionsDashboardPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ approvalStatus: 'PENDING' });

  const params = useMemo(() => ({
    page,
    limit: 10,
    search: search || undefined,
    approvalStatus: filters.approvalStatus || undefined,
    departmentId: filters.departmentId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }), [page, search, filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['requisitions-dashboard', params],
    queryFn: () => requisitionsApi.getAll(params).then((r) => r.data),
  });

  const { data: summaryRes } = useQuery({
    queryKey: ['requisitions-summary'],
    queryFn: () => requisitionsApi.getSummary(),
  });

  const { data: departments = [] } = useQuery({ queryKey: ['dept-active'], queryFn: () => departmentService.getAllActive() });

  const rows = data?.data ?? [];
  const total = data?.total ?? rows.length;
  const summary = summaryRes?.data ?? {};
  const pagination = buildPagination(total, page, 10);

  const setFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link> / Requisitions
        </p>
        <h1 className="text-2xl font-bold">Requisition Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track approval workflow for manpower requests.</p>
      </div>

      <SummaryCards
        columns="sm:grid-cols-3"
        items={[
          { label: 'Pending', value: summary.PENDING ?? 0, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', value: summary.APPROVED ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Rejected', value: summary.REJECTED ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Requisitions</CardTitle>
          <Link to="/requisitions" className="text-sm text-blue-600 hover:underline">Manage requisitions →</Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={(v) => { setPage(1); setSearch(v); }}
            values={filters}
            onChange={setFilter}
            onClear={() => { setFilters({}); setSearch(''); setPage(1); }}
            onExport={() => exportToCsv('requisitions', rows.map((r: any) => ({
              RequisitionID: r.requisitionNumber,
              Department: r.department?.name,
              RequestedBy: `${r.createdBy?.firstName} ${r.createdBy?.lastName}`,
              Position: r.designation?.name,
              Vacancies: r.numberOfPositions,
              RequestedDate: r.createdAt,
              Status: r.approvalStatus,
              Approver: r.approvedBy ? `${r.approvedBy.firstName} ${r.approvedBy.lastName}` : '',
              Remarks: r.rejectionReason ?? '',
            })))}
            filters={[
              { key: 'departmentId', label: 'Department', options: departments.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'approvalStatus', label: 'Status', options: STATUS_OPTIONS },
              { key: 'dateFrom', label: 'From', type: 'date' },
              { key: 'dateTo', label: 'To', type: 'date' },
            ]}
          />

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requisition ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Vacancies</TableHead>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No requisitions found</TableCell></TableRow>
                ) : rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.requisitionNumber}</TableCell>
                    <TableCell>{row.department?.name}</TableCell>
                    <TableCell>{row.createdBy?.firstName} {row.createdBy?.lastName}</TableCell>
                    <TableCell>{row.designation?.name}</TableCell>
                    <TableCell>{row.numberOfPositions}</TableCell>
                    <TableCell className="text-xs">{format(new Date(row.createdAt), 'dd MMM yyyy')}</TableCell>
                    <TableCell><StatusBadge status={row.approvalStatus} /></TableCell>
                    <TableCell>{row.approvedBy ? `${row.approvedBy.firstName} ${row.approvedBy.lastName}` : '—'}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">{row.rejectionReason ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
