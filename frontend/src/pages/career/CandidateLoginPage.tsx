import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const REMEMBERED_EMAIL_KEY = 'hr_login_email';

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
    <div className="relative min-h-screen w-full bg-gray-100 overflow-hidden">
      {/* Background Image - Full Page */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/career-assets/login-bg.png)',
        }}
      />

      {/* Content - Login Card on Right */}
      <div className="relative z-10 flex min-h-screen items-center justify-end px-4 sm:px-6 lg:px-12">
        <div className="w-full max-w-md lg:max-w-sm">
          {/* White Login Card */}
          <div className="rounded-lg bg-white p-8 sm:p-10 shadow-2xl">
            {/* Card Header */}
            <div className="mb-8 text-center">
              <p className="text-sm font-semibold tracking-wide text-[#FF6B00]">
                Welcome Back!
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#1a1a2e]">
                HR Portal
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                Sign in to continue to the Recruitment
                <br />
                Management System
              </p>
            </div>

            {/* Orange Divider */}
            <div className="mb-8 flex justify-center">
              <div className="h-1 w-12 bg-[#FF6B00]" />
            </div>

            {/* Error Message */}
            {error && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="block text-sm font-semibold text-[#111827]">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] pl-11 text-[#111827] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="block text-sm font-semibold text-[#111827]">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] pl-11 pr-11 text-[#111827] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors hover:text-[#111827]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#E5E7EB] accent-[#FF6B00]"
                  />
                  Remember me
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-[#FF6B00] transition-colors hover:text-[#e86000]"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                loading={loading}
                className="h-11 w-full rounded-lg bg-[#FF6B00] text-white font-semibold transition-colors hover:bg-[#e86000]"
              >
                <span>Sign In</span>
                <svg
                  className="ml-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span className="text-sm text-[#9CA3AF]">or</span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            {/* Support Text */}
            <p className="text-center text-sm text-[#6B7280]">
              Need help? Contact{' '}
              <Link
                to="#"
                className="font-semibold text-[#FF6B00] transition-colors hover:text-[#e86000]"
              >
                HR Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
