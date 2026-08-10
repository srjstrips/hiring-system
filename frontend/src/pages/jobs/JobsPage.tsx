import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { jobsApi } from '@/api/jobs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Search, Eye, Edit, Trash2, Globe, EyeOff, Share2,
  Users, MapPin, Briefcase, Calendar
} from 'lucide-react';
import { ShareJobDialog } from '@/components/jobs/ShareJobDialog';

const statusColors: Record<string, string> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'destructive',
  URGENT: 'destructive',
};

export default function JobsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterPublished, setFilterPublished] = useState<string>('all');
  const [shareJobId, setShareJobId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', search, filterPublished],
    queryFn: () =>
      jobsApi.getAll({
        search: search || undefined,
        isPublished: filterPublished === 'all' ? undefined : filterPublished === 'published',
        limit: 20,
      }).then((r) => r.data),
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      published ? jobsApi.unpublish(id) : jobsApi.publish(id),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: vars.published ? 'Job unpublished' : 'Job published successfully' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: jobsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: 'Job deleted' });
    },
  });

  const jobs = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Job Openings</h1>
          <p className="text-muted-foreground text-sm">Manage and publish job postings</p>
        </div>
        {hasPermission('jobs:create') && (
          <Button onClick={() => navigate('/jobs/create')}>
            <Plus className="mr-2 h-4 w-4" /> Create Job
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex rounded-md border overflow-hidden">
          {['all', 'published', 'draft'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterPublished(f)}
              className={`px-4 py-2 text-sm capitalize transition-colors ${
                filterPublished === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Jobs', value: data?.total ?? 0 },
          { label: 'Published', value: jobs.filter((j) => j.isPublished).length },
          { label: 'Total Applications', value: jobs.reduce((s, j) => s + (j._count?.applications ?? 0), 0) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-muted-foreground text-sm">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No jobs found. Create your first job posting.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg leading-tight">{job.title}</h3>
                      <Badge variant={job.isPublished ? 'default' : 'secondary'}>
                        {job.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                      <Badge variant={statusColors[job.priority] as any}>{job.priority}</Badge>
                      {job.assessmentTemplate && (
                        <Badge variant="outline">Has Assessment</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> {job.department.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.location.city}, {job.location.state}
                      </span>
                      {job.employmentType && (
                        <span>{job.employmentType.name}</span>
                      )}
                      {job.experienceLevel && (
                        <span>{job.experienceLevel.name}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {job._count?.applications ?? 0} applicants
                      </span>
                      {job.closingDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Closes {new Date(job.closingDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {(job.skills ?? []).slice(0, 5).map((s) => (
                        <Badge key={s.skillId} variant="outline" className="text-xs">
                          {s.skill.name}{s.isRequired ? ' *' : ''}
                        </Badge>
                      ))}
                      {(job.skills?.length ?? 0) > 5 && (
                        <Badge variant="outline" className="text-xs">+{job.skills.length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" title="View" asChild>
                      <Link to={`/jobs/${job.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    {(hasPermission('jobs:update') || hasPermission('jobs:publish')) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Share Job"
                        onClick={() => setShareJobId(job.id)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('jobs:update') && (
                      <>
                        <Button variant="ghost" size="icon" title="Edit" asChild>
                          <Link to={`/jobs/${job.id}/edit`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={job.isPublished ? 'Unpublish' : 'Publish'}
                          onClick={() => publishMutation.mutate({ id: job.id, published: job.isPublished })}
                        >
                          {job.isPublished ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                        </Button>
                      </>
                    )}
                    {hasPermission('jobs:delete') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { if (confirm('Delete this job?')) deleteMutation.mutate(job.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ShareJobDialog
        jobId={shareJobId}
        open={!!shareJobId}
        onOpenChange={(open) => { if (!open) setShareJobId(null); }}
      />
    </div>
  );
}
