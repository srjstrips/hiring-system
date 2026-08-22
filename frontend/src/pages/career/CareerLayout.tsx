import type { ReactNode } from 'react';
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

const SOCIAL_LINKS: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/srjworldofsteel/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/srjworldofsteel',
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.12 1.38C1.36 2.67.95 3.34.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.72 1.47 1.38 2.13.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.8-.31 1.47-.72 2.13-1.38.66-.66 1.07-1.33 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.12A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.41a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@srjsteel1971',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
      </svg>
    ),
  },
];

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

            {isAuthenticated && (
              <Link
                to="/careers/recommended"
                className="text-[15px] font-medium text-[#111827] transition-colors duration-150 hover:text-[#F97316]"
              >
                Recommended
              </Link>
            )}

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
            {SOCIAL_LINKS.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] text-[#475569] transition-colors hover:border-[#f97316]/60 hover:text-[#f97316]"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
