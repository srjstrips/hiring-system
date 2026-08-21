import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, MapPin, Calendar, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { jobSharesApi, type JobSharePlatformInfo } from '@/api/jobShares';
import { toast } from '@/hooks/useToast';

interface ShareJobDialogProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'LINKEDIN') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A66C2] text-white font-bold text-sm">
        in
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white font-bold text-sm">
      N
    </div>
  );
}

function PlatformCard({
  platform,
  onShare,
  isSharing,
}: {
  platform: JobSharePlatformInfo;
  onShare: (code: 'LINKEDIN' | 'NAUKRI') => void;
  isSharing: boolean;
}) {
  const isPosted = platform.sharingStatus === 'POSTED';
  const canShare = !isPosted;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <PlatformIcon platform={platform.platform} />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold">{platform.displayName}</p>
              <p className="text-xs text-muted-foreground">
                Integration:{' '}
                <span className={platform.integrationConfigured ? 'text-green-700' : 'text-amber-700'}>
                  {platform.integrationConfigured ? 'Configured' : 'Not Configured'}
                </span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Sharing:</span>
                <StatusBadge status={platform.sharingStatus} />
              </div>
              {platform.sharedAt && (
                <p className="text-xs text-muted-foreground">
                  Shared {new Date(platform.sharedAt).toLocaleString()}
                </p>
              )}
              {platform.externalJobUrl && (
                <a
                  href={platform.externalJobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#FF6B00] hover:underline"
                >
                  View external post <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {platform.errorMessage && platform.sharingStatus !== 'POSTED' && (
                <p className="text-xs text-amber-700 flex items-start gap-1 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {platform.errorMessage}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {isPosted ? (
              <Button variant="outline" size="sm" disabled>
                <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                Posted
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!canShare || isSharing}
                onClick={() => onShare(platform.platform)}
              >
                Share on {platform.displayName}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ShareJobDialog({ jobId, open, onOpenChange }: ShareJobDialogProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['job-share', jobId],
    queryFn: () => jobSharesApi.getContext(jobId!).then((r) => r.data),
    enabled: open && !!jobId,
  });

  const shareMutation = useMutation({
    mutationFn: (platform: 'LINKEDIN' | 'NAUKRI') => jobSharesApi.share(jobId!, platform),
    onSuccess: (res) => {
      const payload = res.data;
      const result = payload.data;
      queryClient.invalidateQueries({ queryKey: ['job-share', jobId] });
      refetch();

      if (result?.posted) {
        toast({ title: 'Job posted', description: result.message || payload.message, variant: 'success' });
      } else {
        // Integration not configured / not actually posted — do not claim success
        toast({
          title: 'Sharing unavailable',
          description: result?.message || payload.message || 'External integration is not configured yet.',
          variant: 'destructive',
        });
      }
    },
    onError: (e: any) => {
      queryClient.invalidateQueries({ queryKey: ['job-share', jobId] });
      refetch();
      toast({
        title: 'Unable to share',
        description: e?.response?.data?.message ?? 'Sharing failed',
        variant: 'destructive',
      });
    },
  });

  const job = data?.data?.job;
  const platforms = data?.data?.platforms ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Job</DialogTitle>
          <DialogDescription>
            Share this opening to LinkedIn or Naukri. External posting requires platform integration to be configured.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !job ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading job details...</div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base leading-tight">{job.title}</h3>
                <Badge variant={job.isPublished ? 'default' : 'secondary'}>
                  {job.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" /> {job.department.name}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location.city}, {job.location.state}
                </span>
                {job.employmentType && <span>{job.employmentType.name}</span>}
                {job.experienceLevel && <span>{job.experienceLevel.name}</span>}
                {job.closingDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Deadline {new Date(job.closingDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 pt-1">
                {job.descriptionSummary}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Status:</span>
                <StatusBadge status={job.positionStatus} />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Platforms</p>
              {platforms.map((p) => (
                <PlatformCard
                  key={p.platform}
                  platform={p}
                  isSharing={shareMutation.isPending}
                  onShare={(code) => shareMutation.mutate(code)}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
