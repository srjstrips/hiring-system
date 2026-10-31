import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi } from '@/api/assessments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';
import { ArrowLeft, Calendar, Search } from 'lucide-react';

function toIsoLocal(localDatetime: string): string | null {
  if (!localDatetime) return null;
  // localDatetime is "YYYY-MM-DDTHH:mm" in Asia/Kolkata — treat as IST by adjusting to UTC
  // IST = UTC+5:30
  const date = new Date(localDatetime);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Format as YYYY-MM-DDTHH:mm in local time
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultAvailableFrom(): string {
  // Now
  return toLocalInput(new Date().toISOString());
}

function defaultExpiresAt(): string {
  // 7 days from now
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return toLocalInput(d.toISOString());
}

export default function AssessmentAssignPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [availableFrom, setAvailableFrom] = useState(defaultAvailableFrom());
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt());

  const { data: assessment } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => assessmentsApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: eligible = [], isLoading } = useQuery({
    queryKey: ['assessment-eligible', id, search],
    queryFn: () =>
      assessmentsApi.getEligibleCandidates(id!, { search: search || undefined }).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assessment-assignments', id],
    queryFn: () => assessmentsApi.getAssignments(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      assessmentsApi.assignCandidates(
        id!,
        Array.from(selected),
        toIsoLocal(availableFrom),
        toIsoLocal(expiresAt)
      ),
    onSuccess: () => {
      toast({ title: 'Candidates assigned', variant: 'success' });
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['assessment-eligible', id] });
      queryClient.invalidateQueries({ queryKey: ['assessment-assignments', id] });
      queryClient.invalidateQueries({ queryKey: ['assessment', id] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const toggle = (applicationId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/assessments/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Assign Assessment</h1>
          <p className="text-sm text-muted-foreground">
            Select candidates at the Personality Assessment stage
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 text-sm space-y-1">
          <p><span className="text-muted-foreground">Assessment:</span> <span className="font-medium">{assessment?.name}</span></p>
          <p><span className="text-muted-foreground">Job:</span> <span className="font-medium">{assessment?.job?.title}</span></p>
        </CardContent>
      </Card>

      {/* Scheduling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Assessment Window (IST)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Opens at</Label>
            <Input
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Candidates can't start before this time</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Expires at</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Link becomes invalid after this time</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Eligible Candidates</CardTitle>
          <p className="text-xs text-muted-foreground">
            Showing candidates currently at the Personality Assessment stage who have not yet completed this assessment.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search candidates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : eligible.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No eligible candidates found. Move candidates to the Personality Assessment stage first, or all have already completed the assessment.
            </div>
          ) : (
            <div className="space-y-2">
              {eligible.map((app) => (
                <label
                  key={app.id}
                  className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(app.id)}
                    onChange={() => toggle(app.id)}
                  />
                  <div>
                    <p className="font-medium">
                      {app.candidate.firstName} {app.candidate.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Applied: {new Date(app.appliedAt).toLocaleDateString()}
                      {app.candidate.totalExperience != null && (
                        <> · Experience: {app.candidate.totalExperience} years</>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{app.candidate.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild><Link to={`/assessments/${id}`}>Cancel</Link></Button>
            <Button
              disabled={selected.size === 0 || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              {assignMutation.isPending ? 'Assigning...' : `Assign & Send Invite (${selected.size})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {assignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Already Assigned ({assignments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border rounded-md p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{a.candidate.firstName} {a.candidate.lastName}</p>
                  <p className="text-xs text-muted-foreground">
                    Assigned {new Date(a.assignedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    {(a as any).expiresAt && (
                      <> · Expires {new Date((a as any).expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</>
                    )}
                  </p>
                  {a.secureToken && (
                    <p className="text-xs text-[#FF6B00] break-all mt-1">
                      {`${window.location.origin}/assessment/t/${a.secureToken}`}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">{a.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
