import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { careerApi } from '@/api/career';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  Calculator,
  Code2,
  Globe,
  MapPin,
  Search,
  Settings,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

const jobIcons = [Code2, TrendingUp, Users, Settings, Calculator, BriefcaseBusiness];

export default function CareerHomePage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data } = useQuery({
    queryKey: ['career-jobs-home'],
    queryFn: () => careerApi.getJobs({ limit: 6 }).then((r) => r.data),
  });

  const { data: filtersData } = useQuery({
    queryKey: ['career-filters'],
    queryFn: () => careerApi.getFilters().then((r) => r.data.data),
  });

  const jobs = data?.data ?? [];
  const departments = filtersData?.departments ?? [];

  const handleSearch = () => {
    navigate(`/careers/jobs?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  return (
    <div className="overflow-hidden bg-white">
      <section
        className="relative min-h-[620px] border-b border-[#E5E7EB] bg-cover bg-[70%_center] px-5 py-20 lg:bg-center lg:px-8 lg:py-28"
        style={{ backgroundImage: "url('/career-assets/steel-rods-hero.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.9)_38%,rgba(255,255,255,0.35)_72%,rgba(255,255,255,0.55)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#ffffff_0%,transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-xl space-y-6">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">
              <span className="h-px w-8 bg-[#f97316]" />
              Build your future with SRJ
            </p>
            <h1 className="text-5xl font-extrabold leading-[1.03] tracking-tight text-[#111827] sm:text-6xl lg:text-7xl">
              Shape Steel.<br />
              Shape Your <span className="text-[#f97316]">Career.</span>
            </h1>
            <p className="max-w-lg text-base leading-7 text-[#475569] sm:text-lg">
              Join SRJ Group and be part of a legacy built on trust, quality, and innovation.
              Together, let&apos;s build a stronger tomorrow.
            </p>
          </div>

          <div className="mt-10 max-w-3xl rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <Input
                  className="h-12 border-0 bg-white pl-12 text-base text-zinc-900 shadow-none placeholder:text-zinc-500 focus-visible:ring-0"
                  placeholder="Search job title, department or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
              <Button size="lg" className="h-12 bg-[#f97316] px-7 text-white hover:bg-[#ea580c]" onClick={handleSearch}>
                Search Jobs
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          </div>

          <div className="mt-10 flex max-w-5xl flex-wrap items-center gap-x-7 gap-y-4 text-xs text-[#475569]">
            <button onClick={() => navigate('/careers/jobs')} className="flex items-center gap-2 transition-colors hover:text-[#f97316]">
              <strong className="text-xl text-[#f97316]">{data?.total ?? 0}</strong> Open Positions
            </button>
            {departments.slice(0, 5).map((department: any) => (
              <button
                key={department.id}
                className="flex items-center gap-2 transition-colors hover:text-[#f97316]"
                onClick={() => navigate(`/careers/jobs?departmentId=${department.id}`)}
              >
                <Building2 className="h-4 w-4" />
                {department.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#f97316]">Grow with the best</p>
            <h2 className="text-3xl font-bold text-[#111827] sm:text-4xl">Why Join Us?</h2>
            <span className="mx-auto mt-5 block h-0.5 w-14 bg-[#f97316]" />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Zap, title: 'Fast Growth', desc: 'We move fast, think ahead, and learn every day. Your impact is visible from day one.' },
              { icon: Users, title: 'Great Team', desc: 'Work alongside skilled, humble teammates who care deeply about their craft.' },
              { icon: Globe, title: 'Future Focused', desc: 'Build products and processes that strengthen infrastructure across the nation.' },
            ].map(({ icon: Icon, title, desc }) => (
              <article key={title} className="group rounded-xl border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:border-[#f97316]/40 hover:shadow-[0_10px_30px_rgba(249,115,22,0.12)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#f97316]/20 bg-[#f97316]/10 transition-colors group-hover:bg-[#f97316]/20">
                  <Icon className="h-6 w-6 text-[#f97316]" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#111827]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#64748B]">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#E5E7EB] bg-[#F8FAFC] py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-9 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f97316]">Find your place</p>
              <h2 className="text-3xl font-bold text-[#111827] sm:text-4xl">Latest Openings</h2>
            </div>
            <Button variant="outline" className="border-[#f97316]/50 bg-transparent text-[#f97316] hover:bg-[#f97316] hover:text-white" onClick={() => navigate('/careers/jobs')}>
              View All Jobs <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            {jobs.map((job: any, index: number) => {
              const JobIcon = jobIcons[index % jobIcons.length];

              return (
              <article
                key={job.id}
                className="group grid cursor-pointer gap-5 rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-colors hover:border-[#f97316]/40 md:grid-cols-[1fr_auto] md:items-center"
                onClick={() => navigate(`/careers/jobs/${job.slug}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#f97316]/15 bg-[#f97316]/10 text-[#f97316] sm:flex">
                    <JobIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#111827] transition-colors group-hover:text-[#f97316]">{job.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#64748B]">
                      <span className="flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5" />{job.department.name}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location.city}</span>
                      {job.employmentType && <Badge className="border-[#f97316]/20 bg-[#f97316]/10 text-[#fb923c]">{job.employmentType.name}</Badge>}
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="border-[#f97316]/40 bg-transparent text-[#f97316] group-hover:bg-[#f97316] group-hover:text-white">
                  Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </article>
              );
            })}
            {jobs.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#E5E7EB] px-6 py-12 text-center text-[#64748B]">
                New opportunities are coming soon. Check back again or explore all roles.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Job-alert subscribe strip */}
      <section className="border-b border-[#E5E7EB] bg-white py-12">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-[#f97316]/25 bg-[#FFF7ED] p-7 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f97316]/15 text-[#ea580c]">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#111827]">Never miss an opening</h3>
                <p className="mt-1 text-sm text-[#475569]">
                  Subscribe to get the latest postings and job recommendations by email — weekly or monthly.
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className="shrink-0 bg-[#f97316] px-7 text-white hover:bg-[#ea580c]"
              onClick={() => navigate('/careers/recommended')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Subscribe to Job Alerts
            </Button>
          </div>
        </div>
      </section>

      <section
        className="relative border-y border-[#E5E7EB] bg-cover bg-[70%_center] py-14 sm:py-16"
        style={{ backgroundImage: "url('/career-assets/steel-pipes.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.85)_48%,rgba(255,255,255,0.35)_100%)]" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f97316]">Be part of something stronger</p>
            <h2 className="mt-3 text-2xl font-bold text-[#111827] sm:text-3xl">
              Build a stronger tomorrow with <span className="text-[#f97316]">SRJ Group.</span>
            </h2>
            <p className="mt-4 text-[#475569]">Explore opportunities and grow your career with us.</p>
            <Button className="mt-7 bg-[#f97316] text-white hover:bg-[#ea580c]" onClick={() => navigate('/careers/jobs')}>
              View All Jobs <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
