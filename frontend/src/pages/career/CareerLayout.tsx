import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, User, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/careers');
  };

  const closeMobile = () => {
    setMobileOpen(false);
    setAboutExpanded(false);
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

          {/* Mobile: notification + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && <NotificationBell />}
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#374151] transition-colors hover:bg-[#F3F4F6]"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer overlay ──────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeMobile}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="relative ml-auto flex h-full w-[300px] max-w-[85vw] flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex h-16 items-center justify-between border-b border-[#E5E7EB] px-5">
              <img
                src="/career-assets/srj-logo-dark.png"
                alt="SRJ"
                className="h-9 w-auto object-contain"
              />
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeMobile}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#374151] transition-colors hover:bg-[#F3F4F6]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer nav links */}
            <nav className="flex-1 overflow-y-auto px-4 py-4">
              <Link
                to="/careers/jobs"
                onClick={closeMobile}
                className="flex items-center justify-between rounded-lg px-3 py-3 text-[15px] font-medium text-[#111827] transition-colors hover:bg-[#FFF7ED] hover:text-[#F97316]"
              >
                Browse Jobs
                <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
              </Link>

              {isAuthenticated && (
                <Link
                  to="/careers/recommended"
                  onClick={closeMobile}
                  className="flex items-center justify-between rounded-lg px-3 py-3 text-[15px] font-medium text-[#111827] transition-colors hover:bg-[#FFF7ED] hover:text-[#F97316]"
                >
                  Recommended
                  <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
                </Link>
              )}

              {/* About Us expandable */}
              <button
                type="button"
                onClick={() => setAboutExpanded((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-[15px] font-medium text-[#111827] transition-colors hover:bg-[#FFF7ED] hover:text-[#F97316]"
              >
                About Us
                <ChevronDown
                  className={`h-4 w-4 text-[#94A3B8] transition-transform duration-200 ${aboutExpanded ? 'rotate-180' : ''}`}
                />
              </button>
              {aboutExpanded && (
                <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-[#f97316]/20 pl-3">
                  {ABOUT_US_LINKS.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeMobile}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-[14px] text-[#374151] transition-colors hover:text-[#F97316]"
                    >
                      {label}
                      <ExternalLink className="h-3 w-3 shrink-0 text-[#94A3B8]" />
                    </a>
                  ))}
                </div>
              )}

              {isAuthenticated && (
                <Link
                  to="/careers/profile"
                  onClick={closeMobile}
                  className="mt-1 flex items-center gap-2 rounded-lg px-3 py-3 text-[15px] font-medium text-[#111827] transition-colors hover:bg-[#FFF7ED] hover:text-[#F97316]"
                >
                  <User className="h-4 w-4" />
                  {candidate?.firstName ?? 'My Profile'}
                </Link>
              )}
            </nav>

            {/* Drawer footer — auth action */}
            <div className="border-t border-[#E5E7EB] p-4">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#F97316] py-3 text-[15px] font-medium text-[#F97316] transition-colors hover:bg-[#FFF7ED]"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/careers/login"
                    onClick={closeMobile}
                    className="flex items-center justify-center rounded-lg border border-[#E5E7EB] py-3 text-[15px] font-medium text-[#374151] transition-colors hover:border-[#F97316] hover:text-[#F97316]"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/careers/signup"
                    onClick={closeMobile}
                    className="flex items-center justify-center rounded-lg bg-[#F97316] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#EA580C]"
                  >
                    Join Us
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main>
        <Outlet />
      </main>

      <CareerFooter />
    </div>
  );
}
