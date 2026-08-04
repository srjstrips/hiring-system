import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { careerApi } from '@/api/career';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, Briefcase, ArrowRight, Users, Globe, Zap } from 'lucide-react';

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

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-24 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="text-sm">We're hiring!</Badge>
          <h1 className="text-5xl font-bold tracking-tight">
            Find Your Dream Job at <span className="text-primary">HireFlow</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our team of passionate builders. Browse open positions and take the next step in your career.
          </p>
          <div className="flex gap-3 max-w-lg mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-10 h-12 text-base"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/careers/jobs?search=${searchTerm}`)}
              />
            </div>
            <Button size="lg" className="h-12" onClick={() => navigate(`/careers/jobs?search=${searchTerm}`)}>
              Search
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{data?.total ?? 0}</span> open positions
            {filtersData?.departments.slice(0, 3).map((d: any) => (
              <button key={d.id} className="hover:text-primary" onClick={() => navigate(`/careers/jobs?departmentId=${d.id}`)}>
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Why Join Us?</h2>
        <div className="grid grid-cols-3 gap-8">
          {[
            { icon: Zap, title: 'Fast Growth', desc: 'We move fast, ship fast, and learn fast. Your impact is visible from day one.' },
            { icon: Users, title: 'Great Team', desc: 'Work alongside brilliant, humble teammates who care deeply about the craft.' },
            { icon: Globe, title: 'Remote-Friendly', desc: 'Flexible work arrangements with the option to work from anywhere.' },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-muted-foreground text-sm">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Latest Jobs */}
      <section className="bg-muted/30 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Latest Openings</h2>
            <Button variant="outline" onClick={() => navigate('/careers/jobs')}>
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {jobs.map((job: any) => (
              <Card
                key={job.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/careers/jobs/${job.slug}`)}
              >
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{job.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.department.name}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location.city}</span>
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {job.employmentType && <Badge variant="secondary">{job.employmentType.name}</Badge>}
                        {job.experienceLevel && <Badge variant="outline">{job.experienceLevel.name}</Badge>}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
