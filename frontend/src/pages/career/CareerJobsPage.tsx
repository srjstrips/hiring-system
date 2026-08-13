import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { careerApi } from '@/api/career';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Briefcase, Clock, ArrowRight, SlidersHorizontal } from 'lucide-react';

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Open Positions</h1>
        <p className="text-muted-foreground">{data?.total ?? 0} jobs found</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className="w-56 shrink-0 space-y-6">
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Department</h3>
            <div className="space-y-1">
              <button
                onClick={() => setDepartmentId('')}
                className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${!departmentId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
              >
                All Departments
              </button>
              {filtersData?.departments.map((d: any) => (
                <button
                  key={d.id}
                  onClick={() => setDepartmentId(d.id)}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${departmentId === d.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Location</h3>
            <div className="space-y-1">
              <button onClick={() => setLocationId('')} className={`w-full text-left text-sm px-2 py-1.5 rounded ${!locationId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>All Locations</button>
              {filtersData?.locations.map((l: any) => (
                <button key={l.id} onClick={() => setLocationId(l.id)} className={`w-full text-left text-sm px-2 py-1.5 rounded ${locationId === l.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                  {l.city}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Employment Type</h3>
            <div className="space-y-1">
              <button onClick={() => setEmploymentTypeId('')} className={`w-full text-left text-sm px-2 py-1.5 rounded ${!employmentTypeId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>All Types</button>
              {filtersData?.employmentTypes.map((e: any) => (
                <button key={e.id} onClick={() => setEmploymentTypeId(e.id)} className={`w-full text-left text-sm px-2 py-1.5 rounded ${employmentTypeId === e.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Jobs */}
        <div className="flex-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by job title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No jobs match your filters</div>
          ) : (
            <>
              {jobs.map((job: any) => (
                <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/careers/jobs/${job.slug}`)}>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg leading-tight hover:text-primary transition-colors">{job.title}</h3>
                        <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.department.name}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location.city}, {job.location.state}</span>
                          {job.closingDate && (
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Closes {new Date(job.closingDate).toLocaleDateString()}</span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {job.employmentType && <Badge variant="secondary">{job.employmentType.name}</Badge>}
                          {job.experienceLevel && <Badge variant="outline">{job.experienceLevel.name}</Badge>}
                          {job.showSalary && job.salaryMin && (
                            <Badge variant="outline">
                              ₹{(Number(job.salaryMin) / 100000).toFixed(1)}L
                              {job.salaryMax ? ` – ₹${(Number(job.salaryMax) / 100000).toFixed(1)}L` : '+'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {data && data.totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <span className="flex items-center text-sm text-muted-foreground">Page {page} of {data.totalPages}</span>
                  <Button variant="outline" disabled={page === data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
