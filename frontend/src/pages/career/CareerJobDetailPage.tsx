import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { careerApi } from '@/api/career';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Briefcase, ChevronRight } from 'lucide-react';

export default function CareerJobDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['career-job', slug],
    queryFn: () => careerApi.getJob(slug!).then((r) => r.data.data),
    enabled: !!slug,
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-12 text-muted-foreground">Loading...</div>;
  if (!data) return <div className="max-w-4xl mx-auto px-4 py-12 text-muted-foreground">Job not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link to="/careers" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/careers/jobs" className="hover:text-foreground">Jobs</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{data.title}</span>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-3">{data.title}</h1>
            <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{data.department.name}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{data.location.city}, {data.location.state}</span>
              {data.employmentType && <Badge variant="secondary">{data.employmentType.name}</Badge>}
              {data.experienceLevel && <Badge variant="outline">{data.experienceLevel.name}</Badge>}
            </div>
          </div>

          {/* JD Sections */}
          {[
            { title: 'About This Role', content: data.description },
            { title: 'What You\'ll Do', content: data.responsibilities },
            { title: 'What We\'re Looking For', content: data.requirements },
            { title: 'Benefits & Perks', content: data.benefits },
          ].filter((s) => s.content).map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{section.content}</p>
            </div>
          ))}

          {/* Skills */}
          {data.skills.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((s: any) => (
                  <Badge key={s.skillId} variant={s.isRequired ? 'default' : 'outline'}>
                    {s.skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardContent className="pt-6 space-y-4">
              <Button className="w-full" size="lg" asChild>
                <Link to={`/careers/jobs/${slug}/apply`}>Apply Now</Link>
              </Button>

              <div className="space-y-3 text-sm">
                {[
                  { label: 'Department', value: data.department.name },
                  { label: 'Location', value: `${data.location.city}, ${data.location.state}` },
                  { label: 'Employment', value: data.employmentType?.name ?? '—' },
                  { label: 'Experience', value: data.experienceLevel?.name ?? '—' },
                  { label: 'Openings', value: `${data.numberOfPositions} positions` },
                  ...(data.closingDate ? [{ label: 'Apply By', value: new Date(data.closingDate).toLocaleDateString() }] : []),
                  ...(data.showSalary && data.salaryMin ? [{
                    label: 'Salary',
                    value: `₹${(Number(data.salaryMin) / 100000).toFixed(1)}L${data.salaryMax ? ` – ₹${(Number(data.salaryMax) / 100000).toFixed(1)}L` : '+'}`,
                  }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
