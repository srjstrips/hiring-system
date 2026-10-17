import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { careerApi } from '@/api/career';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  ArrowRight,
  ChevronDown,
  RotateCcw,
  User,
  Code2,
  TrendingUp,
  Users,
  Settings,
  Cpu,
  BriefcaseBusiness,
  ShieldCheck,
  Star,
  Calculator,
} from 'lucide-react';

const JOB_ICONS = [Code2, TrendingUp, Users, Settings, Cpu, BriefcaseBusiness, ShieldCheck, Star, Calculator];

// ── Filter dropdown ──────────────────────────────────────────────────────────

function FilterSelect({
  icon: Icon,
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f97316]" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white pl-10 pr-9 text-sm text-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CareerJobsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') ?? '');
  const [locationId, setLocationId] = useState('');
  const [employmentTypeId, setEmploymentTypeId] = useState('');
  const [page, setPage] = useState(1);

  const { data: filtersData } = useQuery({
    queryKey: ['career-filters'],
    queryFn: () => careerApi.getFilters().then((r) => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['career-jobs', search, departmentId, locationId, employmentTypeId, page],
    queryFn: () =>
      careerApi
        .getJobs({
          search: search || undefined,
          departmentId: departmentId || undefined,
          locationId: locationId || undefined,
          employmentTypeId: employmentTypeId || undefined,
          page,
          limit: 12,
        })
        .then((r) => r.data),
  });

  const jobs = data?.data ?? [];
  const hasFilters = !!(search || departmentId || locationId || employmentTypeId);

  const clearFilters = () => {
    setSearch('');
    setDepartmentId('');
    setLocationId('');
    setEmploymentTypeId('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden bg-cover bg-[70%_center] px-5 py-12 sm:py-16 lg:bg-center lg:px-8"
        style={{ backgroundImage: "url('/career-assets/steel-rods-hero.png')" }}
      >
        {/* gradient overlay — left-heavy so text stays readable */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.92)_45%,rgba(255,255,255,0.50)_75%,rgba(255,255,255,0.60)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#ffffff_0%,transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#f97316]">
            <span className="h-px w-7 bg-[#f97316]" />
            Build your future with SRJ
          </p>
          <h1 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-[#111827] sm:text-4xl lg:text-5xl">
            Find the perfect role that{' '}
            <span className="text-[#f97316]">matches your skills and passion.</span>
          </h1>
        </div>
      </section>

      {/* ── FILTERS + JOBS ────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        {/* Filter panel */}
        <div className="mb-7 space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <FilterSelect
              icon={Briefcase}
              label="Department"
              value={departmentId}
              onChange={(v) => { setDepartmentId(v); setPage(1); }}
              placeholder="All Departments"
              options={(filtersData?.departments ?? []).map((d: any) => ({ id: d.id, label: d.name }))}
            />
            <FilterSelect
              icon={MapPin}
              label="Location"
              value={locationId}
              onChange={(v) => { setLocationId(v); setPage(1); }}
              placeholder="All Locations"
              options={(filtersData?.locations ?? []).map((l: any) => ({ id: l.id, label: l.city }))}
            />
            <FilterSelect
              icon={User}
              label="Employment Type"
              value={employmentTypeId}
              onChange={(v) => { setEmploymentTypeId(v); setPage(1); }}
              placeholder="All Types"
              options={(filtersData?.employmentTypes ?? []).map((e: any) => ({ id: e.id, label: e.name }))}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <Input
              className="h-12 rounded-lg border-[#E5E7EB] pl-10 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus-visible:ring-[#f97316]"
              placeholder="Search by job title, keywords, or skills..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Results header */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[#475569]">
            <span className="font-bold text-[#111827]">{data?.total ?? 0}</span>{' '}
            {(data?.total ?? 0) === 1 ? 'job' : 'jobs'} found
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-sm text-[#475569] transition-colors hover:text-[#f97316]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {/* Job list */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[#F1F5F9]" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] py-16 text-center text-[#64748B]">
            No jobs match your filters.
            {hasFilters && (
              <button onClick={clearFilters} className="ml-2 font-medium text-[#f97316] hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {jobs.map((job: any, index: number) => {
                const JobIcon = JOB_ICONS[index % JOB_ICONS.length];
                return (
                  <article
                    key={job.id}
                    className="group flex cursor-pointer items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:border-[#f97316]/40 hover:shadow-[0_4px_16px_rgba(249,115,22,0.10)] sm:p-5"
                    onClick={() => navigate(`/careers/jobs/${job.slug}`)}
                  >
                    {/* Left icon */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#f97316]/15 bg-[#f97316]/10 text-[#f97316] sm:h-14 sm:w-14">
                      <JobIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-[#111827] transition-colors group-hover:text-[#f97316] sm:text-base">
                        {job.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
                        <span className="flex items-center gap-1 shrink-0">
                          <Briefcase className="h-3 w-3" />
                          {job.department?.name}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <MapPin className="h-3 w-3" />
                          {job.location?.city}{job.location?.state ? `, ${job.location.state}` : ''}
                        </span>
                        {job.closingDate && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            Closes {new Date(job.closingDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.employmentType?.name && (
                          <Badge className="border-[#f97316]/20 bg-[#f97316]/10 text-[11px] text-[#ea580c]">
                            {job.employmentType.name}
                          </Badge>
                        )}
                        {job.experienceLevel?.name && (
                          <Badge variant="secondary" className="text-[11px]">
                            {job.experienceLevel.name}
                          </Badge>
                        )}
                        {job.showSalary && job.salaryMin && (
                          <Badge variant="outline" className="text-[11px]">
                            ₹{(Number(job.salaryMin) / 100000).toFixed(1)}L
                            {job.salaryMax ? ` – ₹${(Number(job.salaryMax) / 100000).toFixed(1)}L` : '+'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-5 w-5 shrink-0 text-[#f97316] transition-transform group-hover:translate-x-0.5" />
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="border-[#E5E7EB] text-[#374151] hover:border-[#f97316] hover:text-[#f97316]"
                >
                  Previous
                </Button>
                <span className="text-sm text-[#64748B]">
                  Page <span className="font-semibold text-[#111827]">{page}</span> of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="border-[#E5E7EB] text-[#374151] hover:border-[#f97316] hover:text-[#f97316]"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
