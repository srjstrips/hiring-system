import { useMemo, useState } from 'react';
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
] as const;

function asRows(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data;
  }
  return [];
}

function payload(res: any) {
  // ApiResponse: { success, message, data }
  return res?.data ?? res ?? null;
}

export default function InsightsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('hiring');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-muted-foreground mt-1">
          HR management analytics across hiring, onboarding, retention, and notice period.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm rounded-md font-medium transition-colors',
              tab === t.id ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {t.label}
          </button>
        ))}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(onboardingSummary).map(([k, v]) => (
                <div key={k} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{String(k).replace(/_/g, ' ')}</p>
                  <p className="text-xl font-bold">{String(v)}</p>
                </div>
              ))}
            </div>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {Object.entries(retentionSummary).map(([k, v]) => (
                  <div key={k} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{String(k).replace(/_/g, ' ')}</p>
                    <p className="text-xl font-bold">{String(v)}</p>
                  </div>
                ))}
              </div>
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
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(noticeSummary).map(([k, v]) => (
                <div key={k} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{String(k).replace(/_/g, ' ')}</p>
                  <p className="text-xl font-bold">{String(v)}</p>
                </div>
              ))}
            </div>
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
                      No notice period records
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
    </div>
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
              No data yet
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
