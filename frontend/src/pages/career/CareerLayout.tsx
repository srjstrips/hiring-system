import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, User } from 'lucide-react';
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
      {/* WHITE navigation bar */}
      <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex h-[84px] max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Logo */}
          <Link to="/careers" className="block shrink-0" aria-label="SRJ Careers home">
            <img
              src="/career-assets/srj-logo-dark.png"
              alt="SRJ — World of Steel"
              className="h-14 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              to="/careers/jobs"
              className="text-[15px] font-medium text-[#111827] transition-colors duration-150 hover:text-[#F97316]"
            >
              Browse Jobs
            </Link>

            {isAuthenticated ? (
              <>
                <span className="flex items-center gap-1.5 text-[15px] font-medium text-[#475569]">
                  <User className="h-4 w-4" />
                  {candidate?.firstName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-[42px] items-center gap-1.5 rounded-[8px] border border-[#F97316] bg-white px-5 text-[15px] font-medium text-[#111827] transition-colors duration-150 hover:bg-[#FFF7ED] hover:text-[#F97316]"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </>
            ) : (
              <Link
                to="/careers/signup"
                className="inline-flex h-[42px] items-center rounded-[8px] bg-[#F97316] px-5 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-[#EA580C]"
              >
                Join Us
              </Link>
            )}
          </nav>

          {/* Mobile: show menu icon */}
          <Link to="/careers/jobs" className="sm:hidden" aria-label="Browse jobs">
            <Menu className="h-6 w-6 text-[#111827]" />
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
