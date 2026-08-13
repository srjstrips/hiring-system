import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

/** Old on-apply assessment links land here. Assessments are now HR-assigned only. */
export default function AssessmentPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold">Application received</h1>
      <p className="text-muted-foreground">
        There is no assessment to take right after applying. Our HR team will review your
        profile first, then screening and interview rounds. If an assessment is needed later,
        we will email you a link.
      </p>
      <Button variant="outline" asChild>
        <Link to="/careers/jobs">Browse More Jobs</Link>
      </Button>
    </div>
  );
}
