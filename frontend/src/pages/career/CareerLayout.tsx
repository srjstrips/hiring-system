import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, User, ChevronDown, ExternalLink } from 'lucide-react';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';
import NotificationBell from '@/components/career/NotificationBell';
import CareerFooter from '@/components/career/CareerFooter';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const ABOUT_US_LINKS = [
  { label: 'Company Overview', href: 'https://srjsteel.in/about/' },
  { label: 'Quality Assurance', href: 'https://srjsteel.in/quality-assurance/' },
  { label: 'Manufacturing Process', href: 'https://srjsteel.in/process/' },
  { label: 'Dealer Network', href: 'https://srjsteel.in/dealer-network/' },
  { label: 'Awards & Recognitions', href: 'https://srjsteel.in/awards-recognitions/' },
  { label: 'Certifications and Licences', href: 'https://srjsteel.in/certifications-and-licences/' },
  { label: 'CSR', href: 'https://srjsteel.in/csr-activities/' },
  { label: 'Clients', href: 'https://srjsteel.in/clients/' },
];

function AboutUsMenuItems() {
  return (
    <>
      {ABOUT_US_LINKS.map(({ label, href }) => (
        <DropdownMenuItem key={label} asChild className="cursor-pointer px-3 py-2 text-[14px] text-[#111827]">
          <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2">
            {label}
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
          </a>
        </DropdownMenuItem>
      ))}
    </>
  );
}

export default function CareerLayout() {
  const { candidate, isAuthenticated, logout } = useCandidateAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate('/careers');
  };

  return (
    <div className="career-theme min-h-screen bg-white text-[#111827]">
      {/* ── Sticky nav bar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Logo */}
          <Link to="/careers" className="block shrink-0" aria-label="SRJ Careers home">
            <img
              src="/career-assets/srj-logo-dark.png"
              alt="SRJ — World of Steel"
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/careers/jobs"
              className="text-[15px] font-medium text-[#111827] transition-colors hover:text-[#F97316]"
            >
              Browse Jobs
            </Link>

            {isAuthenticated && (
              <Link
                to="/careers/recommended"
                className="text-[15px] font-medium text-[#111827] transition-colors hover:text-[#F97316]"
              >
                Recommended
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger className="group flex items-center gap-1 text-[15px] font-medium text-[#111827] outline-none transition-colors hover:text-[#F97316]">
                About Us
                <ChevronDown className="h-4 w-4 transition-transform duration-150 group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 rounded-xl border-[#E5E7EB] p-1.5 shadow-lg">
                <AboutUsMenuItems />
              </DropdownMenuContent>
            </DropdownMenu>

            {isAuthenticated ? (
              <>
                <NotificationBell />
                <Link
                  to="/careers/profile"
                  className="flex items-center gap-1.5 text-[15px] font-medium text-[#475569] transition-colors hover:text-[#F97316]"
                >
                  <User className="h-4 w-4" />
                  {candidate?.firstName}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-[42px] items-center gap-1.5 rounded-[8px] border border-[#F97316] bg-white px-5 text-[15px] font-medium text-[#111827] transition-colors hover:bg-[#FFF7ED] hover:text-[#F97316]"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </>
            ) : (
              <Link
                to="/careers/signup"
                className="inline-flex h-[42px] items-center rounded-[8px] bg-[#F97316] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#EA580C]"
              >
                Join Us
              </Link>
            )}
          </nav>

          {/* Mobile: notification + profile dropdown */}
          <div className="flex items-center gap-1 md:hidden">
            {isAuthenticated && <NotificationBell />}

            {/* Quick auth / profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account options"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[#374151] transition-colors hover:bg-[#F3F4F6]"
                >
                  {isAuthenticated && candidate?.firstName ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F97316] text-xs font-bold text-white">
                      {candidate.firstName[0].toUpperCase()}
                    </span>
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E5E7EB] p-1.5 shadow-lg">
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/careers/profile" className="flex items-center gap-2 px-2 py-2 text-[14px] text-[#111827]">
                        <User className="h-4 w-4 shrink-0" />
                        {candidate?.firstName ?? 'My Profile'}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex cursor-pointer items-center gap-2 px-2 py-2 text-[14px] text-red-600"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Log out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/careers/login" className="px-2 py-2 text-[14px] font-medium text-[#111827]">
                        Sign In
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/careers/signup" className="px-2 py-2 text-[14px] font-semibold text-[#F97316]">
                        Create Account
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <CareerFooter />
    </div>
  );
}
