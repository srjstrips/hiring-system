import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

export default function CareerLayout() {
  const { candidate, isAuthenticated, logout } = useCandidateAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/careers');
  };

  return (
    <div className="career-theme dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090909]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/careers" className="block" aria-label="SRJ Careers home">
            <img
              src="/career-assets/srj-logo.png"
              alt="SRJ — TMT, HR Coil and Pipes"
              className="h-14 w-auto object-contain"
            />
          </Link>
          <nav className="hidden items-center gap-5 sm:flex">
            <Link to="/careers/jobs" className="text-sm font-medium text-zinc-300 transition-colors hover:text-[#f97316]">
              Browse Jobs
            </Link>
            {isAuthenticated ? (
              <>
                <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                  <User className="h-4 w-4" />
                  {candidate?.firstName}
                </span>
                <Button variant="outline" size="sm" className="border-[#f97316]/50 bg-transparent hover:bg-[#f97316]/10" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link to="/careers/login">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:bg-white/5 hover:text-white">Candidate Login</Button>
                </Link>
                <Link to="/careers/signup">
                  <Button size="sm" className="bg-[#f97316] text-white hover:bg-[#ea580c]">Join Us</Button>
                </Link>
              </>
            )}
            <Link to="/login">
              <Button variant="outline" size="sm" className="border-[#f97316]/60 bg-transparent text-white hover:bg-[#f97316]">
                <User className="mr-1.5 h-3.5 w-3.5" />
                HR Login
              </Button>
            </Link>
          </nav>
          <Link to="/careers/jobs" className="sm:hidden" aria-label="Browse jobs">
            <Menu className="h-6 w-6 text-zinc-200" />
          </Link>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-[#090909]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 px-5 py-9 sm:flex-row lg:px-8">
          <div>
            <Link to="/careers" aria-label="SRJ Careers home">
              <img
                src="/career-assets/srj-logo.png"
                alt="SRJ — TMT, HR Coil and Pipes"
                className="h-16 w-auto object-contain"
              />
            </Link>
            <p className="mt-2 text-xs text-zinc-500">© {new Date().getFullYear()} SRJ Group. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-3 text-zinc-400">
            <span className="mr-2 text-xs">Follow Us</span>
            {[
              { label: 'LinkedIn', mark: 'in' },
              { label: 'Instagram', mark: '◎' },
              { label: 'YouTube', mark: '▶' },
            ].map(({ label, mark }) => (
              <a key={label} href="#" aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-xs font-bold transition-colors hover:border-[#f97316]/60 hover:text-[#f97316]">
                {mark}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
