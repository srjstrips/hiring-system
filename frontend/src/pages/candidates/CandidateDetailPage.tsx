import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi } from '@/api/candidates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Phone, Briefcase, Clock, FileText, Link2, DollarSign, Award } from 'lucide-react';

const stageColor: Record<string, string> = {
  APPLIED: 'bg-[#FFEDD5] text-[#EA580C]',
  SCREENING: 'bg-yellow-100 text-yellow-700',
  SHORTLISTED: 'bg-purple-100 text-purple-700',
  SELECTED: 'bg-green-100 text-green-700',
  OFFER_SENT: 'bg-green-100 text-green-700',
  OFFER_ACCEPTED: 'bg-green-100 text-green-700',
  JOINED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-700',
};

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => candidatesApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  if (!candidate) return <div className="text-center py-20 text-muted-foreground">Candidate not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/candidates')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{candidate.firstName} {candidate.lastName}</h1>
          {candidate.currentDesignation && candidate.currentCompany && (
            <p className="text-sm text-muted-foreground">{candidate.currentDesignation} @ {candidate.currentCompany}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Profile */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Profile</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Mail, value: candidate.email },
                  { icon: Phone, value: candidate.phone ?? '—' },
                  { icon: Briefcase, value: candidate.currentCompany ?? '—' },
                  { icon: Clock, value: candidate.totalExperience != null ? `${candidate.totalExperience} years experience` : '—' },
                  { icon: Clock, value: candidate.noticePeriodDays != null ? `${candidate.noticePeriodDays} days notice` : '—' },
                  { icon: DollarSign, value: candidate.expectedSalary ? `₹${(Number(candidate.expectedSalary) / 100000).toFixed(1)}L expected` : '—' },
                ].map(({ icon: Icon, value }, i) => (
                  <div key={i} className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{value}</span>
                  </div>
                ))}
              </div>

              {candidate.profileSummary && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Summary</p>
                  <p className="leading-relaxed">{candidate.profileSummary}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                {candidate.resumeUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={candidate.resumeUrl} target="_blank" rel="noreferrer">
                      <FileText className="h-3.5 w-3.5 mr-1.5" /> Resume
                    </a>
                  </Button>
                )}
                {candidate.linkedinUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer">
                      <Link2 className="h-3.5 w-3.5 mr-1.5" /> LinkedIn
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Applications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Applications ({candidate.applications?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!candidate.applications?.length ? (
                <p className="text-sm text-muted-foreground">No applications yet</p>
              ) : (
                <div className="space-y-3">
                  {candidate.applications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{app.job.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </p>
                        {app.assessmentAttempt?.score != null && (
                          <p className="text-xs mt-0.5">
                            Assessment: {app.assessmentAttempt.score}% {app.assessmentAttempt.isPassed ? '✓' : '✗'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${stageColor[app.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {app.status.replace(/_/g, ' ')}
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/applications/${app.id}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Certifications & achievements */}
          {(candidate.certificates?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Certifications & Achievements ({candidate.certificates?.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {candidate.certificates?.map((cert: any) => (
                    <div key={cert.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex min-w-0 items-center gap-2 text-sm">
                        <Award className="h-4 w-4 shrink-0 text-[#F97316]" />
                        <span className="truncate font-medium">{cert.name || cert.fileOriginalName || 'Certificate'}</span>
                      </div>
                      {cert.fileUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={cert.fileUrl} target="_blank" rel="noreferrer">
                            <FileText className="h-3.5 w-3.5 mr-1.5" /> View
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              {candidate.source && (
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium">{candidate.source.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Added</p>
                <p className="font-medium">{new Date(candidate.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Applications</p>
                <p className="font-medium">{candidate._count.applications}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
