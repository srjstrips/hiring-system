import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, Hourglass, Users, Gift, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SummaryCards } from '@/components/common/SummaryCards';
import { FilterBar } from '@/components/common/FilterBar';
import { insightsApi } from '@/api/dashboard';
import { departmentService } from '@/services/master.service';

export default function TimeToHirePage() {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const params = useMemo(() => ({
    departmentId: filters.departmentId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  }), [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['time-to-hire', params],
    queryFn: () => insightsApi.timeToHire(params),
  });

  const { data: departments = [] } = useQuery({ queryKey: ['dept-active'], queryFn: () => departmentService.getAllActive() });

  const metrics = data?.data?.metrics ?? data?.metrics ?? {};
  const breakdowns = data?.data?.breakdowns ?? data?.breakdowns ?? {};
  const remarks: string[] = data?.data?.remarks ?? data?.remarks ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          <Link to="/dashboard" className="text-[#FF6B00] hover:underline">Dashboard</Link> / Time to Hire
        </p>
        <h1 className="text-2xl font-bold">Average Time to Hire Analytics</h1>
        <p className="text-muted-foreground mt-1">Hiring velocity metrics with department and recruiter breakdowns.</p>
      </div>

      <FilterBar
        values={filters}
        onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
        onClear={() => setFilters({})}
        filters={[
          { key: 'departmentId', label: 'Department', options: departments.map((d) => ({ value: d.id, label: d.name })) },
          { key: 'dateFrom', label: 'From', type: 'date' },
          { key: 'dateTo', label: 'To', type: 'date' },
        ]}
      />

      <SummaryCards
        columns="sm:grid-cols-2 lg:grid-cols-5"
        items={[
          { label: 'Avg Time to Hire', value: `${metrics.avgHire ?? 0}d`, icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Avg Time to Screen', value: `${metrics.avgScreen ?? 0}d`, icon: Hourglass, color: 'text-[#FF6B00]', bg: 'bg-[#FFF7ED]' },
          { label: 'Avg Time to Interview', value: `${metrics.avgInterview ?? 0}d`, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Avg Offer Acceptance', value: `${metrics.avgOfferAccept ?? 0}d`, icon: Gift, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg Joining Time', value: `${metrics.avgJoining ?? 0}d`, icon: UserCheck, color: 'text-violet-600', bg: 'bg-violet-50' },
        ]}
      />

      {remarks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {remarks.map((r, i) => (
              <p key={i} className="text-sm rounded-md bg-muted/50 px-3 py-2">{r}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(['byDepartment', 'byPosition', 'byRecruiter', 'byMonth'] as const).map((key) => {
          const titleMap = {
            byDepartment: 'By Department',
            byPosition: 'By Position',
            byRecruiter: 'By Recruiter',
            byMonth: 'By Month',
          };
          const rows = breakdowns[key] ?? [];
          return (
            <Card key={key}>
              <CardHeader><CardTitle className="text-base">{titleMap[key]}</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Hires</TableHead>
                        <TableHead>Avg Days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row: any) => (
                        <TableRow key={row.key ?? row.name}>
                          <TableCell>{row.name ?? row.key}</TableCell>
                          <TableCell>{row.count ?? row.hires ?? 0}</TableCell>
                          <TableCell>{row.avgDays ?? 0}d</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
