import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { careerApi } from '@/api/career';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Briefcase,
  ChevronRight,
  Home,
  Clock,
  BarChart2,
  Users,
  ArrowRight,
  CalendarDays,
  Layers,
} from 'lucide-react';

function parseLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

export default function CareerJobDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useCandidateAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['career-job', slug],
    queryFn: () => careerApi.getJob(slug!).then((r) => r.data.data),
    enabled: !!slug,
  });

  if (isLoading)
    return <div className="max-w-5xl mx-auto px-5 py-12 text-muted-foreground">Loading…</div>;
  if (!data)
    return <div className="max-w-5xl mx-auto px-5 py-12 text-muted-foreground">Job not found</div>;

  const applyHref = isAuthenticated
    ? `/careers/jobs/${slug}/apply`
    : `/careers/login?redirect=${encodeURIComponent(`/careers/jobs/${slug}/apply`)}`;

  const responsibilities = parseLines(data.responsibilities);
  const requirements = parseLines(data.requirements);

  const infoItems = [
    { icon: MapPin, label: 'Location', value: `${data.location.city}, ${data.location.state}` },
    { icon: Briefcase, label: 'Department', value: data.department.name },
    { icon: Clock, label: 'Employment', value: data.employmentType?.name ?? '—' },
    { icon: BarChart2, label: 'Experience', value: data.experienceLevel?.name ?? '—' },
    { icon: Users, label: 'Openings', value: `${data.numberOfPositions} Position${data.numberOfPositions !== 1 ? 's' : ''}` },
  ];

  return (
    <div className="overflow-x-hidden bg-white pb-24 lg:pb-0">
      {/* ── Sticky mobile Apply CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white px-4 py-3 shadow-lg lg:hidden">
        <Button
          className="h-12 w-full bg-[#F97316] text-base font-semibold text-white hover:bg-[#EA580C]"
          onClick={() => navigate(applyHref)}
        >
          Apply Now <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-12">
        {/* ── Breadcrumbs ── */}
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-[#6B7280]">
          <Link to="/careers" className="flex items-center gap-1 hover:text-[#F97316]">
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link to="/careers/jobs" className="hover:text-[#F97316]">Jobs</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium text-[#F97316]">{data.title}</span>
        </nav>

        {/* ── Job title ── */}
        <h1 className="mb-5 text-3xl font-extrabold text-[#111827] lg:text-4xl">{data.title}</h1>

        {/* ── Metadata badges ── */}
        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-sm text-[#374151]">
            <Briefcase className="h-3.5 w-3.5 text-[#6B7280]" />
            {data.department.name}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-sm text-[#374151]">
            <MapPin className="h-3.5 w-3.5 text-[#6B7280]" />
            {data.location.city}, {data.location.state}
          </span>
          {data.employmentType?.name && (
            <span className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-sm text-[#374151]">
              <Clock className="h-3.5 w-3.5 text-[#6B7280]" />
              {data.employmentType.name}
            </span>
          )}
          {data.experienceLevel?.name && (
            <span className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-sm text-[#374151]">
              <BarChart2 className="h-3.5 w-3.5 text-[#6B7280]" />
              {data.experienceLevel.name}
            </span>
          )}
          {data.closingDate && (
            <span className="flex items-center gap-1.5 rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-3 py-1.5 text-sm text-[#C2410C]">
              <CalendarDays className="h-3.5 w-3.5" />
              Apply by {new Date(data.closingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* ── Apply Now button (desktop) ── */}
        <div className="mb-10 hidden lg:block">
          <Button
            className="h-12 min-w-[200px] bg-[#F97316] px-8 text-base font-semibold text-white hover:bg-[#EA580C]"
            onClick={() => navigate(applyHref)}
          >
            Apply Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* ── About This Role ── */}
        {data.description && (
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-[#111827]">
              <span className="h-6 w-1 shrink-0 rounded-full bg-[#F97316]" />
              About This Role
            </h2>
            <p className="leading-7 text-[#374151] whitespace-pre-wrap">{data.description}</p>
          </section>
        )}

        {/* ── Info row ── */}
        <div className="mb-10 overflow-hidden rounded-xl border border-[#E5E7EB]">
          <div className="grid grid-cols-2 divide-x divide-y divide-[#E5E7EB] sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF7ED]">
                  <Icon className="h-4 w-4 text-[#F97316]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#9CA3AF]">{label}</p>
                  <p className="truncate text-sm font-semibold text-[#111827]">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          {/* ── What You'll Do ── */}
          {data.responsibilities && (
            <section>
              <h2 className="mb-1.5 flex items-center gap-3 text-xl font-bold text-[#111827]">
                <span className="h-6 w-1 shrink-0 rounded-full bg-[#F97316]" />
                What You'll Do
              </h2>
              {responsibilities.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-[#6B7280]">Key responsibilities for this role include:</p>
                  <div className="grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
                    {responsibilities.map((line, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-[#F97316]" />
                        <span className="text-sm leading-6 text-[#374151]">{line}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="leading-7 text-[#374151] whitespace-pre-wrap">{data.responsibilities}</p>
              )}
            </section>
          )}

          {/* ── What We're Looking For ── */}
          {data.requirements && (
            <section>
              <h2 className="mb-1.5 flex items-center gap-3 text-xl font-bold text-[#111827]">
                <span className="h-6 w-1 shrink-0 rounded-full bg-[#F97316]" />
                What We're Looking For
              </h2>
              {requirements.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-[#6B7280]">Skills and experience we're looking for:</p>
                  <div className="grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
                    {requirements.map((line, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-[#F97316]" />
                        <span className="text-sm leading-6 text-[#374151]">{line}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="leading-7 text-[#374151] whitespace-pre-wrap">{data.requirements}</p>
              )}
            </section>
          )}

          {/* ── Benefits & Perks ── */}
          {data.benefits && (
            <section>
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-[#111827]">
                <span className="h-6 w-1 shrink-0 rounded-full bg-[#F97316]" />
                Benefits &amp; Perks
              </h2>
              <p className="leading-7 text-[#374151] whitespace-pre-wrap">{data.benefits}</p>
            </section>
          )}

          {/* ── Required Skills ── */}
          {data.skills?.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-[#111827]">
                <span className="h-6 w-1 shrink-0 rounded-full bg-[#F97316]" />
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((s: any) => (
                  <Badge
                    key={s.skillId}
                    className={
                      s.isRequired
                        ? 'border-[#F97316]/30 bg-[#FFF7ED] text-[#C2410C] hover:bg-[#FFEDD5]'
                        : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]'
                    }
                    variant="outline"
                  >
                    {s.skill.name}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* ── Salary (if public) ── */}
          {data.showSalary && data.salaryMin && (
            <section>
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-[#111827]">
                <span className="h-6 w-1 shrink-0 rounded-full bg-[#F97316]" />
                Compensation
              </h2>
              <p className="text-[#374151]">
                ₹{(Number(data.salaryMin) / 100000).toFixed(1)}L
                {data.salaryMax ? ` – ₹${(Number(data.salaryMax) / 100000).toFixed(1)}L` : '+'} per annum
              </p>
            </section>
          )}
        </div>

        {/* ── Bottom CTA (desktop) ── */}
        <div className="mt-12 hidden items-center gap-4 rounded-2xl border border-[#F97316]/20 bg-[#FFF7ED] p-6 lg:flex">
          <div className="flex-1">
            <p className="font-semibold text-[#111827]">Ready to apply for {data.title}?</p>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              {data.location.city}, {data.location.state} · {data.department.name}
            </p>
          </div>
          <Button
            className="h-11 shrink-0 bg-[#F97316] px-8 font-semibold text-white hover:bg-[#EA580C]"
            onClick={() => navigate(applyHref)}
          >
            Apply Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
