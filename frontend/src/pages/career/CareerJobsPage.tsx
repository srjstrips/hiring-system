import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { careerApi } from '@/api/career';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';

function FilterSelect({
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
}: {
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f97316]" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-8 text-sm text-[#111827] transition-colors focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
    </div>
  );
}

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
      careerApi.getJobs({
        search: search || undefined,
        departmentId: departmentId || undefined,
        locationId: locationId || undefined,
        employmentTypeId: employmentTypeId || undefined,
        page,
        limit: 12,
      }).then((r) => r.data),
  });

  const jobs = data?.data ?? [];

  const clearFilters = () => {
    setSearch('');
    setDepartmentId('');
    setLocationId('');
    setEmploymentTypeId('');
    setPage(1);
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-[#E5E7EB] bg-white px-5 py-12 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-center text-3xl font-bold text-[#111827] sm:text-4xl">Discover Your Next Opportunity</h1>
          <p className="mt-3 text-center text-[#475569]">
            Find the perfect role that matches your skills and passion.
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="space-y-6">
          {/* Filters Row */}
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-[#475569]">Department</label>
                <FilterSelect
                  icon={Briefcase}
                  value={departmentId}
                  onChange={(v) => { setDepartmentId(v); setPage(1); }}
                  placeholder="All Departments"
                  options={(filtersData?.departments ?? []).map((d: any) => ({ id: d.id, label: d.name }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-[#475569]">Location</label>
                <FilterSelect
                  icon={MapPin}
                  value={locationId}
                  onChange={(v) => { setLocationId(v); setPage(1); }}
                  placeholder="All Locations"
                  options={(filtersData?.locations ?? []).map((l: any) => ({ id: l.id, label: l.city }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-[#475569]">Employment Type</label>
                <FilterSelect
                  icon={User}
                  value={employmentTypeId}
                  onChange={(v) => { setEmploymentTypeId(v); setPage(1); }}
                  placeholder="All Types"
                  options={(filtersData?.employmentTypes ?? []).map((e: any) => ({ id: e.id, label: e.name }))}
                />
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <Input
              className="h-11 rounded-lg border-[#E5E7EB] pl-9 text-sm focus-visible:ring-[#f97316]"
              placeholder="Search by job title, keywords, or skills..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Results Count and Clear */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#475569]">
              <span className="font-semibold text-[#111827]">{data?.total ?? 0}</span> {data?.total === 1 ? 'job' : 'jobs'} found
            </p>
            {(search || departmentId || locationId || employmentTypeId) && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm text-[#475569] transition-colors hover:text-[#f97316]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          {/* Jobs List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-[#64748B]">Loading...</div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center text-[#64748B]">No jobs match your filters</div>
            ) : (
              <>
                {jobs.map((job: any) => (
                  <Card
                    key={job.id}
                    className="cursor-pointer rounded-lg border-[#E5E7EB] transition-shadow hover:shadow-md"
                    onClick={() => navigate(`/careers/jobs/${job.slug}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-[#111827] transition-colors hover:text-[#f97316]">
                            {job.title}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.department.name}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location.city}, {job.location.state}</span>
                            {job.closingDate && (
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Closes {new Date(job.closingDate).toLocaleDateString()}</span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {job.employmentType && <Badge variant="info" className="text-xs">{job.employmentType.name}</Badge>}
                            {job.experienceLevel && <Badge variant="secondary" className="text-xs">{job.experienceLevel.name}</Badge>}
                            {job.showSalary && job.salaryMin && (
                              <Badge variant="outline" className="text-xs">
                                ₹{(Number(job.salaryMin) / 100000).toFixed(1)}L
                                {job.salaryMax ? ` – ₹${(Number(job.salaryMax) / 100000).toFixed(1)}L` : '+'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 shrink-0 text-[#64748B] transition-colors group-hover:text-[#f97316]" />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {data && data.totalPages > 1 && (
                  <div className="flex justify-center gap-2 pt-4">
                    <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <span className="flex items-center text-sm text-[#64748B]">Page {page} of {data.totalPages}</span>
                    <Button variant="outline" disabled={page === data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
