import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/api/jobs';
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

  if (isLoading) return (
    <div className="flex items-center justify-center py-24 text-sm text-[#64748B]">Loading...</div>
  );
  if (!data) return (
    <div className="flex items-center justify-center py-24 text-sm text-[#64748B]">Job not found</div>
  );

  const infoRows = [
    { icon: MapPin, label: 'Location', value: `${data.location.city}, ${data.location.state}` },
    { icon: Briefcase, label: 'Employment', value: data.employmentType?.name ?? '—' },
    { icon: Layers, label: 'Experience', value: data.experienceLevel?.name ?? '—' },
    { icon: Users, label: 'Positions', value: `${data.numberOfPositions}` },
    { icon: Calendar, label: 'Closes', value: data.closingDate ? new Date(data.closingDate).toLocaleDateString() : 'Open' },
    { icon: Clock, label: 'Priority', value: data.priority },
  ];

  const descSections = [
    { title: 'Overview', content: data.description },
    { title: 'Responsibilities', content: data.responsibilities },
    { title: 'Requirements', content: data.requirements },
    { title: 'Benefits & Perks', content: data.benefits },
  ].filter((s) => s.content);

  return (
    <div className="relative bg-[#F7F9FC] px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1100px] space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate('/jobs')}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white text-[#334155] transition-colors hover:bg-[#F8FAFC]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-[22px] font-bold leading-tight text-[#0F172A]">{data.title}</h1>
              <p className="text-sm text-[#64748B]">{data.department.name} · {data.designation.name}</p>
            </div>
          </div>

          {hasPermission('jobs:update') && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                className="inline-flex h-[40px] items-center gap-2 rounded-[8px] border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC]"
              >
                {data.isPublished
                  ? <><EyeOff className="h-4 w-4" />Unpublish</>
                  : <><Globe className="h-4 w-4" />Publish</>}
              </button>
              <Link
                to={`/jobs/${id}/edit`}
                className="inline-flex h-[40px] items-center gap-2 rounded-[8px] bg-[#F97316] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
              >
                <Edit className="h-4 w-4" />Edit
              </Link>
            </div>
          )}
        </div>

        {/* View Applications CTA */}
        <div>
          <Link
            to={`/applications?jobId=${encodeURIComponent(data.id)}`}
            className="inline-flex h-[40px] items-center gap-2 rounded-[8px] border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC]"
          >
            <Users className="h-4 w-4 text-[#F97316]" />
            View Applications ({data._count.applications})
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: data._count.applications, label: 'Total Applications', sub: null },
            { value: data.numberOfPositions, label: 'Open Positions', sub: null },
            {
              value: null,
              label: data.isPublished ? 'Published' : 'Draft',
              sub: data.publishedAt ? `Since ${new Date(data.publishedAt).toLocaleDateString()}` : null,
              isStatus: true,
            },
          ].map((stat, i) => (
            <div key={i} className="rounded-[12px] border border-[#E5E7EB] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              {stat.isStatus ? (
                <>
                  <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${data.isPublished ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    {stat.label}
                  </span>
                  {stat.sub && <p className="mt-1.5 text-xs text-[#64748B]">{stat.sub}</p>}
                </>
              ) : (
                <>
                  <div className="text-[28px] font-bold text-[#0F172A]">{stat.value}</div>
                  <div className="mt-0.5 text-sm text-[#64748B]">{stat.label}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Main content: two columns */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-5">
            {/* Job Details card */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              <div className="border-b border-[#E5E7EB] px-6 py-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">Job Details</h2>
              </div>
              <div className="space-y-3 px-6 py-5">
                {infoRows.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                    <span className="w-[90px] shrink-0 text-sm text-[#64748B]">{label}:</span>
                    <span className="text-sm font-medium text-[#0F172A]">{value}</span>
                  </div>
                ))}
                {data.showSalary && (data.salaryMin || data.salaryMax) && (
                  <div className="flex items-center gap-3">
                    <span className="w-[90px] shrink-0 text-sm text-[#64748B]">Salary:</span>
                    <span className="text-sm font-medium text-[#0F172A]">
                      {data.salaryMin ? `₹${(Number(data.salaryMin) / 100000).toFixed(1)}L` : ''}
                      {data.salaryMin && data.salaryMax ? ' – ' : ''}
                      {data.salaryMax ? `₹${(Number(data.salaryMax) / 100000).toFixed(1)}L` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Required Skills card */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              <div className="border-b border-[#E5E7EB] px-6 py-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">Required Skills</h2>
              </div>
              <div className="px-6 py-5">
                {data.skills.length === 0 ? (
                  <p className="text-sm text-[#94A3B8]">No skills specified</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map((s: any) => (
                      <span
                        key={s.skillId}
                        className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${s.isRequired ? 'bg-[#FFF7ED] text-[#EA580C]' : 'border border-[#E5E7EB] bg-white text-[#64748B]'}`}
                      >
                        {s.skill.name}{s.isRequired ? ' *' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assessment card */}
            <div className="rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-6 py-4">
                <ClipboardList className="h-4 w-4 text-[#94A3B8]" />
                <h2 className="text-sm font-semibold text-[#0F172A]">Assessment</h2>
              </div>
              <div className="px-6 py-5">
                {data.assessmentTemplate ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[#0F172A]">{data.assessmentTemplate.title}</p>
                    <p className="text-sm text-[#64748B]">{data.assessmentTemplate.durationMins} minutes</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/assessments/${data.assessmentTemplate.id}`}
                        className="inline-flex h-[34px] items-center rounded-[8px] border border-[#E5E7EB] bg-white px-4 text-xs font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC]"
                      >
                        View Assessment
                      </Link>
                      <Link
                        to={`/assessments?jobId=${id}`}
                        className="inline-flex h-[34px] items-center rounded-[8px] border border-[#E5E7EB] bg-white px-4 text-xs font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC]"
                      >
                        All for Job
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-3 text-sm text-[#94A3B8]">No assessment attached to this job.</p>
                    {hasPermission('assessments:create') && (
                      <Link
                        to={`/assessments/new?jobId=${id}`}
                        className="inline-flex h-[34px] items-center rounded-[8px] border border-[#E5E7EB] bg-white px-4 text-xs font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC]"
                      >
                        Create Assessment
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column — description sections */}
          <div className="space-y-5">
            {descSections.map((section) => (
              <div key={section.title} className="rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                <div className="border-b border-[#E5E7EB] px-6 py-4">
                  <h2 className="text-sm font-semibold text-[#0F172A]">{section.title}</h2>
                </div>
                <div className="px-6 py-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#334155]">{section.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Career portal link */}
        {data.isPublished && (
          <div>
            <a
              href={`/careers/jobs/${data.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[40px] items-center gap-2 rounded-[8px] border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC]"
            >
              <Globe className="h-4 w-4 text-[#F97316]" />
              View on Career Portal
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
