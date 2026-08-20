import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DoodleBackdrop } from '@/components/common/DoodleBackdrop';

const REMEMBERED_EMAIL_KEY = 'hr_login_email';

function SrjWordmark() {
  return (
    <div className="flex flex-col items-center">
      <img src="/career-assets/srj-logo-dark.png" alt="SRJ" className="h-16 w-auto sm:h-20" />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FF6B00]">
        Building Tomorrow Together
      </p>
    </div>
  );
}

function safeInternalPath(raw: string | null): string | null {
  if (!raw) return null;
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) return null;
  return path;
}

function candidateDestination(redirect: string | null) {
  const path = safeInternalPath(redirect);
  if (path && path.startsWith('/careers')) return path;
  return '/careers/jobs';
}

function hrDestination(redirect: string | null) {
  const path = safeInternalPath(redirect);
  if (path && !path.startsWith('/careers')) return path;
  return '/dashboard';
}

function readRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

const inputClass =
  'h-11 rounded-xl border-[#E2E8F0] bg-white pl-10 text-[#111827] placeholder:text-slate-400 focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/25 focus-visible:ring-offset-0';

/** Canonical login UI for both candidates and HR/staff. */
export default function CandidateLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const { login: hrLogin, isAuthenticated: hrAuthenticated, isLoading: hrLoading } = useAuth();
  const {
    login: candidateLogin,
    isAuthenticated: candidateAuthenticated,
    isLoading: candidateLoading,
  } = useCandidateAuth();

  const rememberedEmail = readRememberedEmail();
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (candidateLoading || hrLoading) return;
    if (candidateAuthenticated) {
      navigate(candidateDestination(redirect), { replace: true });
      return;
    }
    if (hrAuthenticated) {
      navigate(hrDestination(redirect), { replace: true });
    }
  }, [candidateAuthenticated, candidateLoading, hrAuthenticated, hrLoading, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (rememberMe) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      /* ignore */
    }

    try {
      await candidateLogin(email, password);
      navigate(candidateDestination(redirect), { replace: true });
      return;
    } catch {
      // not a candidate — try HR
    }

    try {
      await hrLogin(email, password);
      navigate(hrDestination(redirect), { replace: true });
      return;
    } catch {
      setError('Invalid email or password.');
    }

    setLoading(false);
  };

  return (
    <div className="relative overflow-x-hidden bg-white text-[#111827]">
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#FFF7F2]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#FFF7F2]" />
      <DoodleBackdrop className="pointer-events-none absolute inset-0 h-full w-full opacity-90" />

      <div className="relative mx-auto flex max-w-6xl flex-col px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
          <section className="flex flex-col items-center text-center">
            <SrjWordmark />
            <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome <span className="text-[#FF6B00]">Back!</span>
            </h1>
            <p className="mt-3 max-w-sm rounded-lg bg-white/70 px-3 py-1 text-sm leading-relaxed text-[#64748B] backdrop-blur-[2px]">
              Sign in to continue to your account.
            </p>
          </section>

          <section className="w-full">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#111827]">Login</h2>
                <p className="mt-1 text-sm text-[#64748B]">Enter your credentials to access your account</p>
              </div>

              {error && (
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#111827]">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FF6B00]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      autoComplete="email"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#111827]">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FF6B00]" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className={`${inputClass} pr-10`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#111827]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#64748B]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#FF6B00]"
                    />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="text-sm font-medium text-[#FF6B00] hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  className="h-11 w-full rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
                >
                  Login
                </Button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
