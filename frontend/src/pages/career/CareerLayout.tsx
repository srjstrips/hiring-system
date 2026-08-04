import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Briefcase, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CareerLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/careers" className="flex items-center gap-2 font-bold text-lg">
            <Briefcase className="h-6 w-6 text-primary" />
            HireFlow Careers
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/careers/jobs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Browse Jobs
            </Link>
            <Link to="/login">
              <Button variant="outline" size="sm">HR Login</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t mt-24 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} HireFlow. Powered by HireFlow ATS.
      </footer>
    </div>
  );
}
