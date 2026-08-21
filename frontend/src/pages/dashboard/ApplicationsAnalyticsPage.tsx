import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Filter, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SummaryCards } from '@/components/common/SummaryCards';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { applicationsApi } from '@/api/applications';
import { departmentService, recruitmentSourceService } from '@/services/master.service';
import { exportToCsv } from '@/utils/exportCsv';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  'APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW_ROUND_1', 'INTERVIEW_ROUND_2',
  'HR_ROUND', 'SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'JOINED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD',
].map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));

export default function ApplicationsAnalyticsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [groupBy, setGroupBy] = useState('stage');

  const params = useMemo(() => ({
    page,
    limit: 10,
    search: search || undefined,
    departmentId: filters.departmentId || undefined,
    status: filters.status || undefined,
    sourceId: filters.sourceId || undefined,
    ownedById: filters.ownedById || undefined,
    jobId: filters.jobId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    groupBy,
  }), [page, search, filters, groupBy]);

  const { data, isLoading } = useQuery({
    queryKey: ['applications-analytics', params],
    queryFn: () => applicationsApi.getAnalytics(params),
  });

  const { data: departments = [] } = useQuery({ queryKey: ['dept-active'], queryFn: () => departmentService.getAllActive() });
  const { data: sources = [] } = useQuery({ queryKey: ['src-active'], queryFn: () => recruitmentSourceService.getAllActive() });

  const summary = data?.summary ?? {};
  const rows = data?.data ?? [];
  const groups = data?.groups ?? [];
  const pagination = data?.pagination;

  const setFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          <Link to="/dashboard" className="text-[#FF6B00] hover:underline">Dashboard</Link> / Applications Analytics
        </p>
        <h1 className="text-2xl font-bold">Applications Analytics</h1>
        <p className="text-muted-foreground mt-1">Filter, group, and export application pipeline data.</p>
      </div>

      <SummaryCards
        columns="sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
        items={[
          { label: 'Total', value: summary.total ?? 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'New', value: summary.new ?? summary.APPLIED ?? 0, icon: UserPlus, color: 'text-[#FF6B00]', bg: 'bg-[#FFF7ED]' },
          { label: 'Screening', value: summary.SCREENING ?? 0, icon: Filter, color: 'text-[#F97316]', bg: 'bg-[#FFF7ED]' },
          { label: 'Shortlisted', value: summary.SHORTLISTED ?? 0, icon: Eye, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Interviewed', value: summary.interviewed ?? 0, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Selected', value: summary.SELECTED ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Rejected', value: summary.REJECTED ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Applications</CardTitle>
          <select
            className="h-9 rounded-md border px-3 text-sm"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="stage">Group by Stage</option>
            <option value="department">Group by Department</option>
            <option value="position">Group by Position</option>
            <option value="recruiter">Group by Recruiter</option>
          </select>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={(v) => { setPage(1); setSearch(v); }}
            values={filters}
            onChange={setFilter}
            onClear={() => { setFilters({}); setSearch(''); setPage(1); }}
            onExport={() => exportToCsv('applications-analytics', rows.map((r: any) => ({
              Candidate: `${r.candidate?.firstName} ${r.candidate?.lastName}`,
              Email: r.candidate?.email,
              Position: r.job?.title,
              Department: r.job?.department?.name,
              Status: r.status,
              Source: r.source?.name,
              Recruiter: r.ownedBy ? `${r.ownedBy.firstName} ${r.ownedBy.lastName}` : '',
              AppliedAt: r.appliedAt,
            })))}
            filters={[
              { key: 'departmentId', label: 'Department', options: departments.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'sourceId', label: 'Source', options: sources.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'status', label: 'Status', options: STATUS_OPTIONS },
              { key: 'dateFrom', label: 'From', type: 'date' },
              { key: 'dateTo', label: 'To', type: 'date' },
            ]}
          />

          {groups.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {groups.map((g: any) => (
                <div key={g.key} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{g.label ?? g.key}</p>
                  <p className="text-xl font-bold">{g.count}</p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>HR Owner</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No applications found</TableCell></TableRow>
                ) : rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link to={`/applications/${row.id}`} className="font-medium text-[#FF6B00] hover:underline">
                        {row.candidate?.firstName} {row.candidate?.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{row.job?.title}</TableCell>
                    <TableCell>{row.job?.department?.name}</TableCell>
                    <TableCell>{row.ownedBy ? `${row.ownedBy.firstName} ${row.ownedBy.lastName}` : '—'}</TableCell>
                    <TableCell>{row.source?.name ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-xs">{row.appliedAt ? format(new Date(row.appliedAt), 'dd MMM yyyy') : '—'}</TableCell>
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
