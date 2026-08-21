import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Send, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SummaryCards } from '@/components/common/SummaryCards';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { offersApi } from '@/api/offers';
import { departmentService } from '@/services/master.service';
import { exportToCsv } from '@/utils/exportCsv';
import { buildPagination } from '@/utils/buildPagination';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN', 'PENDING_APPROVAL', 'APPROVED']
  .map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));

export default function OffersDashboardPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const params = useMemo(() => ({
    page,
    limit: 10,
    search: search || undefined,
    status: filters.status || undefined,
    departmentId: filters.departmentId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }), [page, search, filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['offers-dashboard', params],
    queryFn: () => offersApi.getAll(params).then((r) => r.data),
  });

  const { data: summaryRes } = useQuery({
    queryKey: ['offers-summary', filters],
    queryFn: () => offersApi.getSummary({
      departmentId: filters.departmentId || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }),
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
          <Link to="/dashboard" className="text-[#FF6B00] hover:underline">Dashboard</Link> / Offers
        </p>
        <h1 className="text-2xl font-bold">Offer Management</h1>
        <p className="text-muted-foreground mt-1">Track offer lifecycle from draft to acceptance.</p>
      </div>

      <SummaryCards
        columns="sm:grid-cols-2 lg:grid-cols-5"
        items={[
          { label: 'Offers Sent', value: summary.SENT ?? summary.sent ?? 0, icon: Send, color: 'text-[#FF6B00]', bg: 'bg-[#FFF7ED]' },
          { label: 'Accepted', value: summary.ACCEPTED ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Rejected', value: summary.REJECTED ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Pending Response', value: summary.pendingResponse ?? summary.SENT ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Expired', value: summary.EXPIRED ?? 0, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Offers</CardTitle>
          <Link to="/offers" className="text-sm text-[#FF6B00] hover:underline">Manage offers →</Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={(v) => { setPage(1); setSearch(v); }}
            values={filters}
            onChange={setFilter}
            onClear={() => { setFilters({}); setSearch(''); setPage(1); }}
            onExport={() => exportToCsv('offers', rows.map((r: any) => ({
              Candidate: `${r.application?.candidate?.firstName} ${r.application?.candidate?.lastName}`,
              Position: r.application?.job?.title ?? r.designation,
              Department: r.department,
              OfferDate: r.sentAt ?? r.createdAt,
              JoiningDate: r.joiningDate,
              Salary: r.ctc,
              Status: r.status,
            })))}
            filters={[
              { key: 'departmentId', label: 'Department', options: departments.map((d) => ({ value: d.id, label: d.name })) },
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
                  <TableHead>Offer Date</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No offers found</TableCell></TableRow>
                ) : rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.application?.candidate?.firstName} {row.application?.candidate?.lastName}
                    </TableCell>
                    <TableCell>{row.application?.job?.title ?? row.designation}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="text-xs">{format(new Date(row.sentAt ?? row.createdAt), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-xs">{row.joiningDate ? format(new Date(row.joiningDate), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell>₹{Number(row.ctc).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
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
