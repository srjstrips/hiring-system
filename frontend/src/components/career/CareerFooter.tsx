import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ArrowUp, ChevronDown } from 'lucide-react';

const CONTACT_INFO = [
  { icon: Phone, label: 'Management Support', value: '+91 70289 98080', href: 'tel:+917028998080' },
  { icon: Phone, label: 'Stores/Purchase Enquiry', value: '+91 98606 27273', href: 'tel:+919860627273' },
  { icon: Mail, label: 'Mail', value: 'info@srjsteel.in', href: 'mailto:info@srjsteel.in' },
  {
    icon: MapPin,
    label: 'Address',
    value: 'D-5/1, Additional MIDC, Jalna - 431203, Maharashtra, India',
    href: 'https://maps.google.com/?q=D-5/1+Additional+MIDC+Jalna+431203',
  },
];

const QUICK_LINKS = [
  { label: 'About Us', href: 'https://srjsteel.in/about/', external: true },
  { label: 'Products', href: 'https://srjsteel.in/products/', external: true },
  { label: 'Projects', href: 'https://srjsteel.in/projects/', external: true },
  { label: 'Blogs', href: 'https://srjsteel.in/blog/', external: true },
  { label: 'Contact Us', href: 'https://srjsteel.in/contact/', external: true },
];

const CAREER_LINKS = [
  { label: 'Careers', href: '/careers', external: false },
  { label: 'Life at SRJ', href: '/careers', external: false },
];

const SOCIAL_LINKS = [
  { icon: 'linkedin', href: 'https://www.linkedin.com/company/srjworldofsteel/', label: 'LinkedIn' },
  { icon: 'facebook', href: 'https://www.facebook.com/srjworldofsteel', label: 'Facebook' },
  { icon: 'youtube', href: 'https://youtube.com/@srjsteel1971', label: 'YouTube' },
  { icon: 'instagram', href: 'https://www.instagram.com/srjworldofsteel', label: 'Instagram' },
];

function SocialIcon({ icon }: { icon: string }) {
  const map: Record<string, React.ReactNode> = {
    instagram: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0-2.16C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.12 1.38C1.36 2.67.95 3.34.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.72 1.47 1.38 2.13.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.8-.31 1.47-.72 2.13-1.38.66-.66 1.07-1.33 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.12A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0z" />
      </svg>
    ),
    facebook: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
      </svg>
    ),
  };
  return <>{map[icon]}</>;
}

function MobileSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[#3a3a3a]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-sm font-semibold uppercase tracking-wider text-white"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-[#B0B0B0] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export default function CareerFooter() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <footer className="relative bg-[#2B2B2B] text-white">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">

        {/* ── Desktop: 4-column grid ────────────────────────────────────────── */}
        <div className="hidden grid-cols-4 gap-8 md:grid">
          {/* Col 1 — Brand */}
          <div>
            <img
              src="/career-assets/srj-white-logo.png"
              alt="SRJ — World of Steel"
              className="mb-4 h-14 w-auto object-contain"
            />
            <p className="mb-5 text-sm leading-6 text-[#B0B0B0]">
              Building a stronger India through quality steel, innovation, and people.
            </p>
            <div className="flex gap-2.5">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-8 w-8 items-center justify-center rounded border border-[#F97316] text-[#F97316] transition-all hover:bg-[#F97316] hover:text-white"
                >
                  <SocialIcon icon={s.icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Contact Information */}
          <div>
            <h3 className="mb-4 border-b border-[#F97316] pb-2 text-sm font-semibold uppercase tracking-wider">
              Contact Information
            </h3>
            <div className="space-y-3">
              {CONTACT_INFO.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.label === 'Address' ? '_blank' : undefined}
                    rel={item.label === 'Address' ? 'noopener noreferrer' : undefined}
                    className="flex gap-2.5 text-sm transition-colors hover:text-[#F97316]"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
                    <div>
                      <p className="text-xs text-[#888]">{item.label}</p>
                      <p className="leading-snug text-[#D1D5DB]">{item.value}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Col 3 — Quick Links */}
          <div>
            <h3 className="mb-4 border-b border-[#F97316] pb-2 text-sm font-semibold uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-[#D1D5DB] transition-colors hover:text-[#F97316]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Career + Downloads */}
          <div>
            <h3 className="mb-4 border-b border-[#F97316] pb-2 text-sm font-semibold uppercase tracking-wider">
              Career
            </h3>
            <ul className="mb-5 space-y-2.5">
              {CAREER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-[#D1D5DB] transition-colors hover:text-[#F97316]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-2 rounded bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#EA580C]"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                SRJ Corporate Brochure
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-2 rounded bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#EA580C]"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Credentials
              </a>
            </div>
          </div>
        </div>

        {/* ── Mobile: stacked collapsible sections ─────────────────────────── */}
        <div className="md:hidden">
          {/* Brand block always visible */}
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src="/career-assets/srj-white-logo.png"
              alt="SRJ — World of Steel"
              className="mb-3 h-12 w-auto object-contain"
            />
            <p className="mb-4 text-sm leading-6 text-[#B0B0B0]">
              Building a stronger India through quality steel, innovation, and people.
            </p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded border border-[#F97316] text-[#F97316] transition-all hover:bg-[#F97316] hover:text-white"
                >
                  <SocialIcon icon={s.icon} />
                </a>
              ))}
            </div>
          </div>

          <MobileSection title="Contact Information">
            <div className="space-y-3">
              {CONTACT_INFO.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.label === 'Address' ? '_blank' : undefined}
                    rel={item.label === 'Address' ? 'noopener noreferrer' : undefined}
                    className="flex gap-2.5 text-sm transition-colors hover:text-[#F97316]"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
                    <div>
                      <p className="text-xs text-[#888]">{item.label}</p>
                      <p className="text-[#D1D5DB]">{item.value}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </MobileSection>

          <MobileSection title="Quick Links">
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-[#D1D5DB] transition-colors hover:text-[#F97316]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </MobileSection>

          <MobileSection title="Career">
            <ul className="mb-4 space-y-2.5">
              {CAREER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-[#D1D5DB] transition-colors hover:text-[#F97316]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center justify-center gap-2 rounded bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                SRJ Corporate Brochure
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center justify-center gap-2 rounded bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Credentials
              </a>
            </div>
          </MobileSection>
        </div>

        {/* ── Copyright bar ─────────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-[#3a3a3a] pt-6 sm:flex-row">
          <p className="text-xs text-[#888]">© {new Date().getFullYear()} SRJ Steel. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-[#888]">
            <a href="https://srjsteel.in/privacy-policy/" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#F97316]">
              Privacy Policy
            </a>
            <a href="https://srjsteel.in/terms-conditions/" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#F97316]">
              Terms &amp; Conditions
            </a>
            <a href="https://srjsteel.in/sitemap.xml" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#F97316]">
              Sitemap
            </a>
          </div>
        </div>
      </div>

      {/* WhatsApp button */}
      <a
        href="https://wa.me/917028998080"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
      >
        <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.255.949c-1.238.503-2.335 1.236-3.356 2.192-1.048 1.007-1.954 2.292-2.468 3.666-.584 1.523-.744 3.148-.404 4.665.169.84.566 1.511 1.173 2.051.602.534 1.213.96 1.933 1.307 1.423.676 2.99.86 4.654.86 1.595 0 3.203-.251 4.633-1.007 1.405-.73 2.694-1.68 3.647-2.93.927-1.214 1.58-2.697 1.863-4.25.176-.944.215-1.932.062-2.908-.19-1.187-.683-2.283-1.357-3.216-.694-.968-1.567-1.784-2.547-2.432-1.053-.693-2.237-.986-3.568-.986z" />
        </svg>
      </a>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          className="fixed bottom-24 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#F97316] text-white shadow-lg transition-all hover:scale-110 hover:bg-[#EA580C]"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </footer>
  );
}
