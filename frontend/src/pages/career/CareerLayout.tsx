import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, User, ChevronDown, Info, ExternalLink } from 'lucide-react';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';
import NotificationBell from '@/components/career/NotificationBell';
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

            <DropdownMenu>
              <DropdownMenuTrigger className="group flex items-center gap-1 text-[15px] font-medium text-[#111827] outline-none transition-colors duration-150 hover:text-[#F97316]">
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

          {/* Mobile: About Us + bell (when logged in) + menu icon */}
          <div className="flex items-center gap-1 sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="About Us"
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#475569] outline-none transition-colors hover:bg-[#FFF7ED] hover:text-[#F97316]"
              >
                <Info className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-w-[90vw] rounded-xl border-[#E5E7EB] p-1.5 shadow-lg">
                <AboutUsMenuItems />
              </DropdownMenuContent>
            </DropdownMenu>
            {isAuthenticated && <NotificationBell />}
            <Link to="/careers/jobs" className="p-2" aria-label="Browse jobs">
              <Menu className="h-6 w-6 text-[#111827]" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-[#E5E7EB] bg-[#F8FAFC]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 px-5 py-9 sm:flex-row lg:px-8">
          <div>
            <Link to="/careers" aria-label="SRJ Careers home">
              <img
                src="/career-assets/srj-logo-dark.png"
                alt="SRJ — TMT, HR Coil and Pipes"
                className="h-16 w-auto object-contain"
              />
            </Link>
            <p className="mt-2 text-xs text-[#64748B]">© {new Date().getFullYear()} SRJ Group. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-3 text-[#475569]">
            <span className="mr-2 text-xs">Follow Us</span>
            {[
              { label: 'LinkedIn', mark: 'in' },
              { label: 'Instagram', mark: '◎' },
              { label: 'YouTube', mark: '▶' },
            ].map(({ label, mark }) => (
              <a key={label} href="#" aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] text-xs font-bold transition-colors hover:border-[#f97316]/60 hover:text-[#f97316]">
                {mark}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
