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
  Clock,
  Code2,
  Cpu,
  Globe,
  MapPin,
  Search,
  Settings,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

const jobIcons = [Code2, TrendingUp, Users, Settings, Cpu, BriefcaseBusiness, ShieldCheck, Star];

export default function CareerHomePage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [alertEmail, setAlertEmail] = useState('');

  const { data } = useQuery({
    queryKey: ['career-jobs-home', selectedDeptId],
    queryFn: () =>
      careerApi.getJobs({ limit: 6, ...(selectedDeptId ? { departmentId: selectedDeptId } : {}) }).then((r) => r.data),
  });

  const { data: filtersData } = useQuery({
    queryKey: ['career-filters'],
    queryFn: () => careerApi.getFilters().then((r) => r.data.data),
  });

  const jobs = data?.data ?? [];
  const departments = filtersData?.departments ?? [];

  const handleSearch = () => {
    const q = searchTerm.trim();
    navigate(`/careers/jobs${q ? `?search=${encodeURIComponent(q)}` : ''}`);
  };

  const handleAlertSubscribe = () => {
    const dest = alertEmail.trim()
      ? `/careers/signup?email=${encodeURIComponent(alertEmail.trim())}`
      : '/careers/recommended';
    navigate(dest);
  };

  return (
    <div className="overflow-x-hidden bg-white">
      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[400px] bg-cover bg-[70%_center] px-5 py-10 sm:py-16 lg:min-h-[600px] lg:bg-center lg:px-8 lg:py-28"
        style={{ backgroundImage: "url('/career-assets/steel-rods-hero.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.9)_38%,rgba(255,255,255,0.35)_72%,rgba(255,255,255,0.55)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#ffffff_0%,transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-xl space-y-6">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#f97316]">
              <span className="h-px w-8 bg-[#f97316]" />
              Build your future with SRJ
            </p>
            <h1 className="text-3xl font-extrabold leading-[1.03] tracking-tight text-[#111827] sm:text-5xl lg:text-7xl">
              Shape Steel.<br />
              Shape Your{' '}
              <span className="text-[#f97316]">Career.</span>
            </h1>
            <p className="max-w-lg text-base leading-7 text-[#475569] sm:text-lg">
              Join SRJ Group and be part of a legacy built on trust, quality, and innovation.
              Together, let&apos;s build a stronger tomorrow.
            </p>
          </div>

          {/* Search bar */}
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
              <Button
                size="lg"
                className="h-12 bg-[#f97316] px-7 text-white hover:bg-[#ea580c]"
                onClick={handleSearch}
              >
                Search Jobs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. DEPARTMENT FILTER TABS ────────────────────────────────────────── */}
      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-hide">
            <button
              onClick={() => setSelectedDeptId(null)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                !selectedDeptId
                  ? 'border-[#f97316] bg-[#f97316] text-white'
                  : 'border-[#E5E7EB] bg-white text-[#374151] hover:border-[#f97316] hover:text-[#f97316]'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              All Departments
            </button>
            {departments.slice(0, 8).map((dept: any) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id === selectedDeptId ? null : dept.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedDeptId === dept.id
                    ? 'border-[#f97316] bg-[#f97316] text-white'
                    : 'border-[#E5E7EB] bg-white text-[#374151] hover:border-[#f97316] hover:text-[#f97316]'
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. LATEST OPENINGS ───────────────────────────────────────────────── */}
      <section className="bg-[#F8FAFC] py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f97316]">Find your place</p>
              <h2 className="text-3xl font-bold text-[#111827] sm:text-4xl">Latest Openings</h2>
            </div>
            <Button
              variant="outline"
              className="shrink-0 border-[#f97316]/50 bg-transparent text-[#f97316] hover:bg-[#f97316] hover:text-white"
              onClick={() =>
                navigate(selectedDeptId ? `/careers/jobs?departmentId=${selectedDeptId}` : '/careers/jobs')
              }
            >
              View All Jobs <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {jobs.map((job: any, index: number) => {
              const JobIcon = jobIcons[index % jobIcons.length];
              return (
                <article
                  key={job.id}
                  className="group grid cursor-pointer gap-5 rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all hover:border-[#f97316]/40 hover:shadow-[0_4px_16px_rgba(249,115,22,0.10)] md:grid-cols-[1fr_auto] md:items-center"
                  onClick={() => navigate(`/careers/jobs/${job.slug}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#f97316]/15 bg-[#f97316]/10 text-[#f97316] sm:flex">
                      <JobIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-[#111827] transition-colors group-hover:text-[#f97316]">
                        {job.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#64748B]">
                        <span className="flex items-center gap-1.5">
                          <BriefcaseBusiness className="h-3.5 w-3.5" />
                          {job.department?.name}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location?.city}
                        </span>
                        {job.employmentType?.name && (
                          <Badge className="border-[#f97316]/20 bg-[#f97316]/10 text-[#fb923c]">
                            {job.employmentType.name}
                          </Badge>
                        )}
                        {job.experienceLevel?.name && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {job.experienceLevel.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0 border-[#f97316]/40 bg-transparent text-[#f97316] group-hover:bg-[#f97316] group-hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/careers/jobs/${job.slug}`);
                    }}
                  >
                    Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </article>
              );
            })}
            {jobs.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#E5E7EB] px-6 py-14 text-center text-[#64748B]">
                {selectedDeptId
                  ? 'No openings in this department right now. Try another or view all jobs.'
                  : 'New opportunities are coming soon. Check back again or explore all roles.'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. WHY JOIN SRJ ─────────────────────────────────────────────────── */}
      <section className="bg-white py-10 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#f97316]">Grow with the best</p>
            <h2 className="text-3xl font-bold text-[#111827] sm:text-4xl">Why Join SRJ?</h2>
            <span className="mx-auto mt-5 block h-0.5 w-14 bg-[#f97316]" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: 'Fast Growth',
                desc: 'We move fast, think ahead, and learn every day. Your impact is visible from day one.',
              },
              {
                icon: Users,
                title: 'Great Team',
                desc: 'Work alongside skilled, humble teammates who care deeply about their craft.',
              },
              {
                icon: Globe,
                title: 'Future Focused',
                desc: 'Build products and processes that strengthen infrastructure across the nation.',
              },
              {
                icon: Star,
                title: 'Meaningful Work',
                desc: 'Be part of an industry that builds the foundation for a stronger, more sustainable tomorrow.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <article
                key={title}
                className="group rounded-xl border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:border-[#f97316]/40 hover:shadow-[0_10px_30px_rgba(249,115,22,0.12)]"
              >
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

      {/* ── 5. LIFE AT SRJ ──────────────────────────────────────────────────── */}
      <section className="bg-[#F8FAFC] py-10 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Text */}
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#f97316]">
                Our people, our strength
              </p>
              <h2 className="text-3xl font-bold text-[#111827] sm:text-4xl">Life at SRJ</h2>
              <span className="mt-4 block h-0.5 w-12 bg-[#f97316]" />
              <p className="mt-5 leading-7 text-[#475569]">
                Work in a dynamic environment, learn from experts, and contribute to projects that power industries and
                communities. At SRJ, every day is an opportunity to make an impact.
              </p>
              <Button
                className="mt-7 bg-[#f97316] text-white hover:bg-[#ea580c]"
                onClick={() => navigate('/careers/jobs')}
              >
                Explore Life at SRJ <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Image grid */}
            <div className="grid grid-cols-2 grid-rows-2 gap-3">
              <div className="col-span-2 h-52 overflow-hidden rounded-xl sm:h-60">
                <img
                  src="/career-assets/steel-rods-hero.png"
                  alt="Workers at SRJ Steel"
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
              </div>
              <div className="h-36 overflow-hidden rounded-xl sm:h-44">
                <img
                  src="/career-assets/steel-pipes.png"
                  alt="SRJ Steel manufacturing"
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
              </div>
              <div className="h-36 overflow-hidden rounded-xl sm:h-44">
                <img
                  src="/career-assets/steel-rods-hero.png"
                  alt="SRJ Steel facility"
                  className="h-full w-full object-cover object-[80%_center]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. JOB ALERTS ───────────────────────────────────────────────────── */}
      <section className="border-y border-[#E5E7EB] bg-white py-8 lg:py-14">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-[#f97316]/25 bg-[#FFF7ED] p-7 sm:flex-row sm:items-center">
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
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <Input
                type="email"
                placeholder="Enter your email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAlertSubscribe()}
                className="h-11 min-w-0 border-[#E5E7EB] bg-white text-sm focus-visible:ring-[#f97316] sm:w-56"
              />
              <Button
                className="h-11 shrink-0 bg-[#f97316] px-6 text-white hover:bg-[#ea580c]"
                onClick={handleAlertSubscribe}
              >
                Subscribe <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. PROMOTIONAL BANNER ───────────────────────────────────────────── */}
      <section
        className="relative border-b border-[#E5E7EB] bg-cover bg-[70%_center] py-14 sm:py-16"
        style={{ backgroundImage: "url('/career-assets/steel-pipes.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.85)_48%,rgba(255,255,255,0.35)_100%)]" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f97316]">
              Be part of something stronger
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#111827] sm:text-3xl">
              Build a stronger tomorrow with{' '}
              <span className="text-[#f97316]">SRJ Group.</span>
            </h2>
            <p className="mt-4 text-[#475569]">Explore opportunities and grow your career with us.</p>
            <Button
              className="mt-7 bg-[#f97316] text-white hover:bg-[#ea580c]"
              onClick={() => navigate('/careers/jobs')}
            >
              View All Jobs <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
