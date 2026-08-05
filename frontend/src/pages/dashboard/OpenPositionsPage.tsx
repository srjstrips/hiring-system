import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, PauseCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SummaryCards } from '@/components/common/SummaryCards';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { jobsApi } from '@/api/jobs';
import { departmentService, designationService, locationService, employmentTypeService, experienceLevelService } from '@/services/master.service';
import { exportToCsv } from '@/utils/exportCsv';
import { format } from 'date-fns';

export default function OpenPositionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const params = useMemo(() => ({
    page,
    limit: 10,
    search: search || undefined,
    departmentId: filters.departmentId || undefined,
    designationId: filters.designationId || undefined,
    locationId: filters.locationId || undefined,
    employmentTypeId: filters.employmentTypeId || undefined,
    experienceLevelId: filters.experienceLevelId || undefined,
    hiringManagerId: filters.hiringManagerId || undefined,
    positionStatus: filters.positionStatus || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }), [page, search, filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['open-positions', params],
    queryFn: () => jobsApi.getOpenPositions(params),
  });

  const { data: departments = [] } = useQuery({ queryKey: ['dept-active'], queryFn: () => departmentService.getAllActive() });
  const { data: designations = [] } = useQuery({ queryKey: ['desig-active'], queryFn: () => designationService.getAllActive() });
  const { data: locations = [] } = useQuery({ queryKey: ['loc-active'], queryFn: () => locationService.getAllActive() });
  const { data: empTypes = [] } = useQuery({ queryKey: ['emp-active'], queryFn: () => employmentTypeService.getAllActive() });
  const { data: expLevels = [] } = useQuery({ queryKey: ['exp-active'], queryFn: () => experienceLevelService.getAllActive() });

  const rows = data?.data ?? [];
  const summary = data?.summary ?? { totalOpen: 0, totalOnHold: 0, totalClosed: 0 };
  const pagination = data?.pagination;

  const setFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link> / Open Positions
        </p>
        <h1 className="text-2xl font-bold">Open Positions</h1>
        <p className="text-muted-foreground mt-1">Detailed position pipeline with vacancy and application metrics.</p>
      </div>

      <SummaryCards
        columns="sm:grid-cols-3"
        items={[
          { label: 'Total Open', value: summary.totalOpen, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total On Hold', value: summary.totalOnHold, icon: PauseCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Closed', value: summary.totalClosed, icon: CheckCircle2, color: 'text-slate-600', bg: 'bg-slate-50' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={(v) => { setPage(1); setSearch(v); }}
            searchPlaceholder="Search position..."
            values={filters}
            onChange={setFilter}
            onClear={() => { setFilters({}); setSearch(''); setPage(1); }}
            onExport={() => exportToCsv('open-positions', rows.map((r: any) => ({
              JobID: r.id?.slice(0, 8),
              Position: r.title,
              Department: r.department?.name,
              Location: r.location?.name,
              HiringManager: r.hiringManager ? `${r.hiringManager.firstName} ${r.hiringManager.lastName}` : '',
              Vacancies: r.numberOfPositions,
              Filled: r.filledPositions,
              Remaining: Math.max(0, (r.numberOfPositions ?? 0) - (r.filledPositions ?? 0)),
              Applications: r.stats?.applications ?? r._count?.applications ?? 0,
              Shortlisted: r.stats?.shortlisted ?? 0,
              Selected: r.stats?.selected ?? 0,
              Rejected: r.stats?.rejected ?? 0,
              Status: r.positionStatus,
              Created: r.createdAt,
            })))}
            filters={[
              { key: 'departmentId', label: 'Department', options: departments.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'designationId', label: 'Designation', options: designations.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'locationId', label: 'Location', options: locations.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'employmentTypeId', label: 'Employment Type', options: empTypes.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'experienceLevelId', label: 'Experience Level', options: expLevels.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'positionStatus', label: 'Status', options: [
                { value: 'OPEN', label: 'Open' },
                { value: 'ON_HOLD', label: 'On Hold' },
                { value: 'CLOSED', label: 'Closed' },
              ]},
              { key: 'dateFrom', label: 'From', type: 'date' },
              { key: 'dateTo', label: 'To', type: 'date' },
            ]}
          />

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Hiring Manager</TableHead>
                  <TableHead>Vacancies</TableHead>
                  <TableHead>Filled</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Shortlisted</TableHead>
                  <TableHead>Selected</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No positions found</TableCell></TableRow>
                ) : rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      <Link to={`/jobs/${row.id}`} className="text-blue-600 hover:underline">{row.id?.slice(0, 8)}</Link>
                    </TableCell>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>{row.department?.name}</TableCell>
                    <TableCell>{row.location?.name}</TableCell>
                    <TableCell>
                      {row.hiringManager ? `${row.hiringManager.firstName} ${row.hiringManager.lastName}` : '—'}
                    </TableCell>
                    <TableCell>{row.numberOfPositions}</TableCell>
                    <TableCell>{row.filledPositions ?? 0}</TableCell>
                    <TableCell>{Math.max(0, (row.numberOfPositions ?? 0) - (row.filledPositions ?? 0))}</TableCell>
                    <TableCell>{row.stats?.applications ?? row._count?.applications ?? 0}</TableCell>
                    <TableCell>{row.stats?.shortlisted ?? 0}</TableCell>
                    <TableCell>{row.stats?.selected ?? 0}</TableCell>
                    <TableCell>{row.stats?.rejected ?? 0}</TableCell>
                    <TableCell><StatusBadge status={row.positionStatus ?? (row.isPublished ? 'OPEN' : 'ON_HOLD')} /></TableCell>
                    <TableCell className="text-xs">{row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && (
            <Pagination
              pagination={pagination}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
