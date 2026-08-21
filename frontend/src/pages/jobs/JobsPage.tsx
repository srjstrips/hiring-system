import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { jobsApi } from '@/api/jobs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Search, Eye, Edit, Trash2, Globe, EyeOff, Share2,
  Users, MapPin, Briefcase, Calendar
} from 'lucide-react';
import { ShareJobDialog } from '@/components/jobs/ShareJobDialog';

const statusColors: Record<string, string> = {
  LOW: 'bg-[#F1F5F9] text-[#64748B]',
  MEDIUM: 'bg-[#FFF7ED] text-[#EA580C]',
  HIGH: 'bg-[#FFF7ED] text-[#FF6B00]',
  URGENT: 'bg-[#FFF1F2] text-rose-700',
};

const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Job Openings</h1>
          <p className="mt-1 text-sm text-[#64748B]">Manage and publish job postings</p>
        </div>
        {hasPermission('jobs:create') && (
          <Button
            onClick={() => navigate('/jobs/create')}
            className="h-10 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Job
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-full flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Search jobs..."
            className="h-10 rounded-xl border-[#E2E8F0] bg-white pl-9 text-[#111827] placeholder:text-[#94A3B8] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/25 focus-visible:ring-offset-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="inline-flex h-10 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          {['all', 'published', 'draft'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterPublished(f)}
              className={`px-4 text-sm capitalize transition-colors ${
                filterPublished === f
                  ? 'bg-[#FF6B00] font-medium text-white'
                  : 'text-[#111827] hover:bg-[#FFF7ED]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Total Jobs', value: data?.total ?? 0 },
          { label: 'Published', value: jobs.filter((j) => j.isPublished).length },
          { label: 'Total Applications', value: jobs.reduce((s, j) => s + (j._count?.applications ?? 0), 0) },
        ].map((s) => (
          <Card key={s.label} className={cardClass}>
            <CardContent className="p-6">
              <div className="text-3xl font-bold tracking-tight text-[#111827]">{s.value}</div>
              <div className="mt-1 text-sm text-[#64748B]">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[#64748B]">Loading...</div>
      ) : jobs.length === 0 ? (
        <Card className={cardClass}>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7ED]">
              <Briefcase className="h-5 w-5 text-[#FF6B00]" />
            </div>
            <p className="font-semibold text-[#111827]">No jobs found</p>
            <p className="mt-1 text-sm text-[#64748B]">Create your first job posting.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card
              key={job.id}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/jobs/${job.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/jobs/${job.id}`);
                }
              }}
              className={`${cardClass} cursor-pointer transition-shadow hover:shadow-md`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold leading-tight text-[#111827]">{job.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${job.isPublished ? 'bg-[#F0FDF4] text-green-700' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                        {job.isPublished ? 'Published' : 'Draft'}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[job.priority] ?? 'bg-[#F1F5F9] text-[#64748B]'}`}>
                        {job.priority}
                      </span>
                      {job.assessmentTemplate && (
                        <span className="rounded-full border border-[#FF6B00]/30 bg-[#FFF7ED] px-2.5 py-0.5 text-xs font-medium text-[#FF6B00]">
                          Has Assessment
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#64748B]">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> {job.department.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.location.city}, {job.location.state}
                      </span>
                      {job.employmentType && <span>{job.employmentType.name}</span>}
                      {job.experienceLevel && <span>{job.experienceLevel.name}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {job._count?.applications ?? 0} applicants
                      </span>
                      {job.closingDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Closes {new Date(job.closingDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(job.skills ?? []).slice(0, 5).map((s) => (
                        <span key={s.skillId} className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-0.5 text-xs text-[#111827]">
                          {s.skill.name}{s.isRequired ? ' *' : ''}
                        </span>
                      ))}
                      {(job.skills?.length ?? 0) > 5 && (
                        <span className="rounded-full border border-[#E2E8F0] px-2.5 py-0.5 text-xs text-[#64748B]">
                          +{job.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex shrink-0 items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" title="View" className="h-9 w-9 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]" asChild>
                      <Link to={`/jobs/${job.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    {(hasPermission('jobs:update') || hasPermission('jobs:publish')) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Share Job"
                        className="h-9 w-9 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]"
                        onClick={() => setShareJobId(job.id)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('jobs:update') && (
                      <>
                        <Button variant="ghost" size="icon" title="Edit" className="h-9 w-9 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]" asChild>
                          <Link to={`/jobs/${job.id}/edit`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={job.isPublished ? 'Unpublish' : 'Publish'}
                          className="h-9 w-9 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]"
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
                        className="h-9 w-9 text-destructive hover:bg-[#FFF1F2] hover:text-destructive"
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
