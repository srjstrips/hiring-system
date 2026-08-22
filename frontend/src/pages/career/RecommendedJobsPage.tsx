import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { careerApi } from '@/api/career';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Briefcase, Clock, ArrowRight, Sparkles, Bell, BellOff } from 'lucide-react';

function SubscribeCard() {
  const [subscribed, setSubscribed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    careerApi
      .getAlertSubscription()
      .then((r) => setSubscribed(Boolean(r.data.data.subscribed)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggle = async () => {
    const next = !subscribed;
    setSaving(true);
    try {
      const r = await careerApi.updateAlertSubscription({ subscribed: next });
      const now = Boolean(r.data.data.subscribed);
      setSubscribed(now);
      alert(
        now
          ? 'Successfully subscribed! You’ll receive weekly and monthly job alerts by email.'
          : 'You have been unsubscribed from job alerts.'
      );
    } catch {
      alert('Sorry, something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card className="mb-6 border-[#F97316]/30 bg-[#FFF7ED]">
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F97316]/15 text-[#EA580C]">
            {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111827]">
              {subscribed ? "You're subscribed to job alerts" : 'Get job alerts by email'}
            </p>
            <p className="text-sm text-[#475569]">
              We'll email you the latest postings and recommendations, weekly and monthly.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={toggle}
          className={`inline-flex h-[38px] shrink-0 items-center rounded-[8px] px-5 text-sm font-semibold transition-colors disabled:opacity-60 ${
            subscribed
              ? 'border border-[#F97316] bg-white text-[#EA580C] hover:bg-[#FFF7ED]'
              : 'bg-[#F97316] text-white hover:bg-[#EA580C]'
          }`}
        >
          {saving ? 'Please wait…' : subscribed ? 'Unsubscribe' : 'Subscribe'}
        </button>
      </CardContent>
    </Card>
  );
}

export default function RecommendedJobsPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['career-recommended'],
    queryFn: () => careerApi.getRecommended().then((r) => r.data.data),
  });

  const jobs: any[] = data ?? [];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-[#E5E7EB] px-5 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-medium text-[#EA580C]">
            <Sparkles className="h-3.5 w-3.5" />
            Personalized for you
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-[#111827] sm:text-4xl">Recommended Jobs</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#475569] sm:text-base">
            Openings matched to your skills, experience and past applications.
          </p>
          <span className="mt-4 block h-0.5 w-10 bg-[#f97316]" />
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">Finding jobs for you...</div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-[#111827]">No recommendations yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Apply to a few jobs or complete your profile, and we'll suggest matches here.
            </p>
            <button
              onClick={() => navigate('/careers/jobs')}
              className="mt-5 inline-flex h-[42px] items-center rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
            >
              Browse all jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/careers/jobs/${job.slug}`)}
              >
                <CardContent className="pb-5 pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold leading-tight transition-colors hover:text-primary">
                        {job.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.department?.name}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location?.city}, {job.location?.state}</span>
                        {job.closingDate && (
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Closes {new Date(job.closingDate).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.employmentType && <Badge variant="secondary">{job.employmentType.name}</Badge>}
                        {job.experienceLevel && <Badge variant="outline">{job.experienceLevel.name}</Badge>}
                        {(job.matchReasons ?? []).map((reason: string) => (
                          <Badge key={reason} variant="outline" className="border-[#F97316]/40 bg-[#FFF7ED] text-[#EA580C]">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Subscribe to alerts — below the latest openings */}
        <div className="mt-8">
          <SubscribeCard />
        </div>
      </div>
    </div>
  );
}
