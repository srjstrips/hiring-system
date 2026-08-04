import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/api/jobs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Edit, Globe, EyeOff, Users, MapPin,
  Briefcase, Calendar, Clock, ClipboardList, Layers
} from 'lucide-react';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: () => data?.isPublished ? jobsApi.unpublish(id!) : jobsApi.publish(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      toast({ title: data?.isPublished ? 'Job unpublished' : 'Job published' });
    },
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!data) return <div className="text-center py-12 text-muted-foreground">Job not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <p className="text-muted-foreground text-sm">{data.department.name} · {data.designation.name}</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('jobs:update') && (
            <>
              <Button variant="outline" onClick={() => publishMutation.mutate()}>
                {data.isPublished ? <><EyeOff className="h-4 w-4 mr-2" />Unpublish</> : <><Globe className="h-4 w-4 mr-2" />Publish</>}
              </Button>
              <Button asChild>
                <Link to={`/jobs/${id}/edit`}><Edit className="h-4 w-4 mr-2" />Edit</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{data._count.applications}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />Total Applications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{data.numberOfPositions}</div>
            <div className="text-sm text-muted-foreground">Open Positions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Badge variant={data.isPublished ? 'default' : 'secondary'} className="text-sm">
              {data.isPublished ? 'Published' : 'Draft'}
            </Badge>
            {data.publishedAt && (
              <p className="text-xs text-muted-foreground mt-1">Since {new Date(data.publishedAt).toLocaleDateString()}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Job Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { icon: MapPin, label: 'Location', value: `${data.location.city}, ${data.location.state}` },
                { icon: Briefcase, label: 'Employment', value: data.employmentType?.name ?? '—' },
                { icon: Layers, label: 'Experience', value: data.experienceLevel?.name ?? '—' },
                { icon: Users, label: 'Positions', value: `${data.numberOfPositions}` },
                { icon: Calendar, label: 'Closes', value: data.closingDate ? new Date(data.closingDate).toLocaleDateString() : 'Open' },
                { icon: Clock, label: 'Priority', value: data.priority },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{label}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              {data.showSalary && (data.salaryMin || data.salaryMax) && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Salary:</span>
                  <span className="font-medium">
                    {data.salaryMin ? `₹${(Number(data.salaryMin) / 100000).toFixed(1)}L` : ''}
                    {data.salaryMin && data.salaryMax ? ' – ' : ''}
                    {data.salaryMax ? `₹${(Number(data.salaryMax) / 100000).toFixed(1)}L` : ''}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader><CardTitle className="text-base">Required Skills</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((s: any) => (
                  <Badge key={s.skillId} variant={s.isRequired ? 'default' : 'outline'}>
                    {s.skill.name}{s.isRequired ? ' *' : ''}
                  </Badge>
                ))}
                {data.skills.length === 0 && <p className="text-sm text-muted-foreground">No skills specified</p>}
              </div>
            </CardContent>
          </Card>

          {/* Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.assessmentTemplate ? (
                <div className="space-y-2">
                  <p className="font-medium">{data.assessmentTemplate.title}</p>
                  <p className="text-sm text-muted-foreground">{data.assessmentTemplate.durationMins} minutes</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/jobs/${id}/assessment`}>Manage Assessment</Link>
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">No assessment attached to this job.</p>
                  {hasPermission('assessments:create') && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/jobs/${id}/assessment`}>Create Assessment</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Description sections */}
          {[
            { title: 'Overview', content: data.description },
            { title: 'Responsibilities', content: data.responsibilities },
            { title: 'Requirements', content: data.requirements },
            { title: 'Benefits & Perks', content: data.benefits },
          ].filter((s) => s.content).map((section) => (
            <Card key={section.title}>
              <CardHeader><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{section.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link to={`/applications?jobId=${id}`}>
            <Users className="h-4 w-4 mr-2" /> View Applications ({data._count.applications})
          </Link>
        </Button>
        {data.isPublished && (
          <Button variant="outline" asChild>
            <a href={`/careers/jobs/${data.slug}`} target="_blank" rel="noreferrer">
              <Globe className="h-4 w-4 mr-2" /> View on Career Portal
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
