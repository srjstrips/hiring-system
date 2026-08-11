import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { insightsApi } from '@/api/dashboard';
import { departmentService } from '@/services/master.service';
import { cn } from '@/utils/cn';

const TABS = [
  { id: 'hiring', label: 'Hiring Overview' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'retention', label: 'Retention' },
  { id: 'notice', label: 'Notice Period' },
  { id: 'inProgress', label: 'In Progress' },
  { id: 'backedOut', label: 'Backed Out' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'onHold', label: 'On Hold' },
  { id: 'companyLeft', label: 'Company Left' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function asRows(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data;
  }
  return [];
}

function payload(res: any) {
  return res?.data ?? res ?? null;
}

function formatDate(value: unknown) {
  if (!value) return '—';
  const d = typeof value === 'string' || value instanceof Date ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) {
    if (typeof value === 'string' && value.length >= 10) return value.slice(0, 10);
    return '—';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function summaryLabel(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export default function InsightsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('hiring');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const params = useMemo(() => ({
    departmentId: filters.departmentId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }), [filters]);

  const { data: departments = [] } = useQuery({
    queryKey: ['dept-active'],
    queryFn: () => departmentService.getAllActive(),
  });

  const hiring = useQuery({
    queryKey: ['insights-hiring', params],
    queryFn: () => insightsApi.hiringOverview(params),
    enabled: tab === 'hiring',
  });
  const byDept = useQuery({
    queryKey: ['insights-dept', params],
    queryFn: () => insightsApi.byDepartment(params),
    enabled: tab === 'hiring',
  });
  const byPos = useQuery({
    queryKey: ['insights-pos', params],
    queryFn: () => insightsApi.byPosition(params),
    enabled: tab === 'hiring',
  });
  const byRec = useQuery({
    queryKey: ['insights-rec', params],
    queryFn: () => insightsApi.byRecruiter(params),
    enabled: tab === 'hiring',
  });
  const onboarding = useQuery({
    queryKey: ['insights-onboarding', params],
    queryFn: () => insightsApi.onboarding(params),
    enabled: tab === 'onboarding',
  });
  const retention = useQuery({
    queryKey: ['insights-retention', params],
    queryFn: () => insightsApi.retention(params),
    enabled: tab === 'retention',
  });
  const notice = useQuery({
    queryKey: ['insights-notice', params],
    queryFn: () => insightsApi.noticePeriod(params),
    enabled: tab === 'notice',
  });
  const inProgress = useQuery({
    queryKey: ['insights-in-progress', params],
    queryFn: () => insightsApi.inProgress(params),
    enabled: tab === 'inProgress',
  });
  const backedOut = useQuery({
    queryKey: ['insights-backed-out', params],
    queryFn: () => insightsApi.backedOut(params),
    enabled: tab === 'backedOut',
  });
  const rejected = useQuery({
    queryKey: ['insights-rejected', params],
    queryFn: () => insightsApi.rejected(params),
    enabled: tab === 'rejected',
  });
  const onHold = useQuery({
    queryKey: ['insights-on-hold', params],
    queryFn: () => insightsApi.onHold(params),
    enabled: tab === 'onHold',
  });
  const companyLeft = useQuery({
    queryKey: ['insights-company-left', params],
    queryFn: () => insightsApi.companyLeft(params),
    enabled: tab === 'companyLeft',
  });

  const hiringRows = asRows(payload(hiring.data));
  const deptRows = asRows(payload(byDept.data));
  const posRows = asRows(payload(byPos.data));
  const recRows = asRows(payload(byRec.data));

  const onboardingPayload = payload(onboarding.data) ?? {};
  const onboardingSummary = onboardingPayload.summary ?? {};
  const onboardingRows = asRows(onboardingPayload.data ?? onboardingPayload);

  const retentionPayload = payload(retention.data) ?? {};
  const retentionSummary = retentionPayload.summary ?? {};
  const retentionRows = asRows(
    retentionPayload.byDepartment ?? retentionPayload.data ?? retentionPayload
  );

  const noticePayload = payload(notice.data) ?? {};
  const noticeSummary = noticePayload.summary ?? {};
  const noticeRows = asRows(noticePayload.data ?? noticePayload);

  const inProgressPayload = payload(inProgress.data) ?? {};
  const backedOutPayload = payload(backedOut.data) ?? {};
  const rejectedPayload = payload(rejected.data) ?? {};
  const onHoldPayload = payload(onHold.data) ?? {};
  const companyLeftPayload = payload(companyLeft.data) ?? {};

  const openApplication = (id: string) => navigate(`/applications/${id}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-muted-foreground mt-1">
          HR management analytics across hiring, onboarding, retention, and recruitment status.
        </p>
      </div>

      <div className="border-b pb-2 -mx-1 px-1 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 text-sm rounded-md font-medium transition-colors whitespace-nowrap',
                tab === t.id ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <FilterBar
        values={filters}
        onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
        onClear={() => setFilters({})}
        filters={[
          {
            key: 'departmentId',
            label: 'Department',
            options: departments.map((d) => ({ value: d.id, label: d.name })),
          },
          { key: 'dateFrom', label: 'From', type: 'date' },
          { key: 'dateTo', label: 'To', type: 'date' },
        ]}
      />

      {tab === 'hiring' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Month-wise Hiring</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleTable
                loading={hiring.isLoading}
                rows={hiringRows}
                columns={[
                  { key: 'month', label: 'Month' },
                  { key: 'applications', label: 'Applications' },
                  { key: 'interviews', label: 'Interviews' },
                  { key: 'offers', label: 'Offers' },
                  { key: 'joining', label: 'Joining' },
                ]}
              />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <BreakdownCard title="Department-wise" loading={byDept.isLoading} rows={deptRows} />
            <BreakdownCard title="Position-wise" loading={byPos.isLoading} rows={posRows} />
            <BreakdownCard title="Recruiter-wise" loading={byRec.isLoading} rows={recRows} />
          </div>
        </div>
      )}

      {tab === 'onboarding' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Onboarding Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryCards summary={onboardingSummary} />
            <SimpleTable
              loading={onboarding.isLoading}
              rows={onboardingRows}
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'offerAccepted', label: 'Offer Accepted' },
                { key: 'offerDeclined', label: 'Offer Declined' },
                { key: 'joined', label: 'Joined' },
                { key: 'notJoined', label: 'Not Joined' },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {tab === 'retention' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retention Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <SummaryCards summary={retentionSummary} className="mb-4" />
              <SimpleTable
                loading={retention.isLoading}
                rows={retentionRows}
                columns={[
                  { key: 'name', label: 'Department / Designation' },
                  { key: 'joined', label: 'Joined' },
                  { key: 'active', label: 'Still Active' },
                  { key: 'left', label: 'Left' },
                  { key: 'retentionPct', label: 'Retention %' },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'notice' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notice Period Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryCards summary={noticeSummary} cols={3} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Notice Start</TableHead>
                  <TableHead>Notice End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notice.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : noticeRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No records found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  noticeRows.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.candidate
                          ? `${row.candidate.firstName} ${row.candidate.lastName}`
                          : row.employeeCode ?? '—'}
                      </TableCell>
                      <TableCell>{row.department?.name}</TableCell>
                      <TableCell>{row.designation?.name}</TableCell>
                      <TableCell className="text-xs">
                        {row.noticeStartDate?.slice?.(0, 10) ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.noticeEndDate?.slice?.(0, 10) ?? '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.noticeStatus ?? row.status} />
                      </TableCell>
                      <TableCell className="text-xs">{row.exitReason ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'inProgress' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">In Progress Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryCards
              summary={inProgressPayload.summary ?? {}}
              labels={{
                totalInProgress: 'Total In Progress',
                screening: 'Screening',
                shortlisted: 'Shortlisted',
                interview: 'Interview',
                selected: 'Selected',
                offerSent: 'Offer Sent',
              }}
              cols={6}
            />
            <InsightTable
              loading={inProgress.isLoading}
              rows={asRows(inProgressPayload.data)}
              columns={[
                { key: 'candidate', label: 'Candidate' },
                { key: 'department', label: 'Department' },
                { key: 'designation', label: 'Designation' },
                { key: 'currentStage', label: 'Current Stage' },
                { key: 'appliedDate', label: 'Applied Date', format: 'date' },
                { key: 'daysInProcess', label: 'Days in Process', format: 'days' },
                { key: 'assignedHr', label: 'Assigned HR / Recruiter' },
              ]}
              onRowClick={(row) => openApplication(row.id)}
            />
          </CardContent>
        </Card>
      )}

      {tab === 'backedOut' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backed Out Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryCards
              summary={backedOutPayload.summary ?? {}}
              labels={{
                totalBackedOut: 'Total Backed Out',
                beforeInterview: 'Before Interview',
                afterInterview: 'After Interview',
                afterOffer: 'After Offer',
              }}
              cols={4}
            />
            <InsightTable
              loading={backedOut.isLoading}
              rows={asRows(backedOutPayload.data)}
              columns={[
                { key: 'candidate', label: 'Candidate' },
                { key: 'department', label: 'Department' },
                { key: 'designation', label: 'Designation' },
                { key: 'lastStage', label: 'Last Stage' },
                { key: 'backedOutDate', label: 'Backed Out Date', format: 'date' },
                { key: 'reason', label: 'Reason' },
              ]}
              onRowClick={(row) => openApplication(row.id)}
            />
          </CardContent>
        </Card>
      )}

      {tab === 'rejected' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rejected Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryCards
              summary={rejectedPayload.summary ?? {}}
              labels={{
                totalRejected: 'Total Rejected',
                rejectedDuringScreening: 'Rejected During Screening',
                rejectedDuringInterview: 'Rejected During Interview',
                rejectedDuringHrRound: 'Rejected During HR Round',
                other: 'Other',
              }}
              cols={6}
            />
            <InsightTable
              loading={rejected.isLoading}
              rows={asRows(rejectedPayload.data)}
              columns={[
                { key: 'candidate', label: 'Candidate' },
                { key: 'department', label: 'Department' },
                { key: 'designation', label: 'Designation' },
                { key: 'rejectedAtStage', label: 'Rejected At Stage' },
                { key: 'rejectedDate', label: 'Rejected Date', format: 'date' },
                { key: 'rejectedBy', label: 'Rejected By' },
                { key: 'reason', label: 'Reason' },
              ]}
              onRowClick={(row) => openApplication(row.id)}
            />
          </CardContent>
        </Card>
      )}

      {tab === 'onHold' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">On Hold Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryCards
              summary={onHoldPayload.summary ?? {}}
              labels={{ totalOnHold: 'Total On Hold' }}
              cols={1}
            />
            <InsightTable
              loading={onHold.isLoading}
              rows={asRows(onHoldPayload.data)}
              columns={[
                { key: 'candidate', label: 'Candidate' },
                { key: 'department', label: 'Department' },
                { key: 'designation', label: 'Designation' },
                { key: 'previousStage', label: 'Current/Previous Stage' },
                { key: 'holdDate', label: 'Hold Date', format: 'date' },
                { key: 'daysOnHold', label: 'Days On Hold', format: 'days' },
                { key: 'holdReason', label: 'Hold Reason' },
              ]}
              onRowClick={(row) => openApplication(row.id)}
            />
          </CardContent>
        </Card>
      )}

      {tab === 'companyLeft' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Left Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryCards
              summary={companyLeftPayload.summary ?? {}}
              labels={{
                totalCompanyLeft: 'Total Company Left',
                voluntaryExit: 'Voluntary Exit',
                involuntaryExit: 'Involuntary Exit',
              }}
              cols={3}
            />
            <InsightTable
              loading={companyLeft.isLoading}
              rows={asRows(companyLeftPayload.data)}
              columns={[
                { key: 'employee', label: 'Employee' },
                { key: 'department', label: 'Department' },
                { key: 'designation', label: 'Designation' },
                { key: 'joiningDate', label: 'Joining Date', format: 'date' },
                { key: 'leavingDate', label: 'Leaving Date', format: 'date' },
                { key: 'tenure', label: 'Tenure' },
                { key: 'exitType', label: 'Exit Type' },
                { key: 'reason', label: 'Reason' },
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCards({
  summary,
  labels,
  cols,
  className,
}: {
  summary: Record<string, unknown>;
  labels?: Record<string, string>;
  cols?: number;
  className?: string;
}) {
  const entries = Object.entries(summary ?? {});
  if (!entries.length) return null;

  const grid =
    cols === 1
      ? 'grid-cols-1 max-w-xs'
      : cols === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : cols === 4
          ? 'grid-cols-2 md:grid-cols-4'
          : cols === 6
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
            : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className={cn('grid gap-3', grid, className)}>
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{labels?.[k] ?? summaryLabel(k)}</p>
          <p className="text-xl font-bold">{String(v)}</p>
        </div>
      ))}
    </div>
  );
}

function InsightTable({
  loading,
  rows,
  columns,
  onRowClick,
}: {
  loading: boolean;
  rows: any[];
  columns: { key: string; label: string; format?: 'date' | 'days' }[];
  onRowClick?: (row: any) => void;
}) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const renderCell = (row: any, col: { key: string; format?: 'date' | 'days' }) => {
    const value = row[col.key];
    if (col.format === 'date') return formatDate(value);
    if (col.format === 'days') {
      if (value === null || value === undefined || value === '') return '—';
      return `${value} day${Number(value) === 1 ? '' : 's'}`;
    }
    return value ?? '—';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.key}>{c.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
              Loading...
            </TableCell>
          </TableRow>
        ) : safeRows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
              No records found for the selected filters.
            </TableCell>
          </TableRow>
        ) : (
          safeRows.map((row, idx) => (
            <TableRow
              key={row.id ?? idx}
              className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <TableCell key={c.key}>{renderCell(row, c)}</TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function BreakdownCard({
  title,
  loading,
  rows,
}: {
  title: string;
  loading: boolean;
  rows: any[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <SimpleTable
          loading={loading}
          rows={rows}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'count', label: 'Hires / Count' },
          ]}
        />
      </CardContent>
    </Card>
  );
}

function SimpleTable({
  loading,
  rows,
  columns,
}: {
  loading: boolean;
  rows: any[];
  columns: { key: string; label: string }[];
}) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.key}>{c.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
              Loading...
            </TableCell>
          </TableRow>
        ) : safeRows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
              No records found for the selected filters.
            </TableCell>
          </TableRow>
        ) : (
          safeRows.map((row, idx) => (
            <TableRow key={row.id ?? row.key ?? row.month ?? row.name ?? idx}>
              {columns.map((c) => (
                <TableCell key={c.key}>
                  {row[c.key] ?? (c.key === 'name' ? row.key : undefined) ?? '—'}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
