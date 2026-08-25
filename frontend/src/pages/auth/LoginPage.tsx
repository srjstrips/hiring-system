import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

const REMEMBERED_EMAIL_KEY = 'hr_login_email';

function readRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

const VALUES = [
  {
    icon: '🛡️',
    title: 'Integrity',
    description: "We do what's right, always.",
  },
  {
    icon: '👥',
    title: 'People First',
    description: 'Empowering our people.',
  },
  {
    icon: '📈',
    title: 'Innovation',
    description: 'Driving better solutions.',
  },
  {
    icon: '⭐',
    title: 'Excellence',
    description: 'Quality in everything we do.',
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const rememberedEmail = readRememberedEmail();
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: rememberedEmail, password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      try {
        if (rememberMe) localStorage.setItem(REMEMBERED_EMAIL_KEY, values.email);
        else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch {
        /* ignore storage errors */
      }
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch {
      toast({ title: 'Login failed', description: 'Invalid email or password', variant: 'destructive' });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/career-assets/login-bg.png)',
        }}
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Orange Accent Decoration */}
      <div className="pointer-events-none absolute -right-40 top-0 z-0 h-80 w-80 rounded-full bg-[#FF6B00]/10 blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* Header with Logo */}
        <header className="px-6 py-8 sm:px-8 lg:px-12">
          <img
            src="/career-assets/srj-logo-dark.png"
            alt="SRJ Logo"
            className="h-10 w-auto sm:h-12"
          />
        </header>

        {/* Main Content */}
        <div className="flex flex-1 items-center justify-between px-6 py-8 sm:px-8 lg:px-12 gap-8 lg:gap-16">
          {/* Left Section - Hidden on Mobile */}
          <section className="hidden lg:flex flex-1 flex-col text-white">
            <h1 className="text-5xl font-bold leading-tight">
              Building Strength.
              <br />
              Building <span className="text-[#FF6B00]">Careers.</span>
            </h1>
            <p className="mt-6 text-base text-white/90 max-w-md">
              SRJ Group is committed to excellence, innovation and people.
            </p>

            {/* Values Grid */}
            <div className="mt-12 grid grid-cols-2 gap-8 max-w-xl">
              {VALUES.map((value) => (
                <div key={value.title} className="text-white">
                  <div className="text-4xl mb-3">{value.icon}</div>
                  <h3 className="font-bold text-base text-white mb-1">{value.title}</h3>
                  <p className="text-sm text-white/80">{value.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Right Section - Login Card */}
          <section className="w-full lg:max-w-md">
            <div className="rounded-3xl bg-white p-8 sm:p-10 shadow-2xl">
              {/* Card Header */}
              <div className="mb-8 text-center">
                <p className="text-[#FF6B00] font-semibold text-sm tracking-wide mb-2">
                  Welcome Back!
                </p>
                <h2 className="text-3xl font-bold text-[#1a1a2e] mb-3">
                  HR Portal
                </h2>
                <p className="text-sm text-[#6B7280]">
                  Sign in to continue to the Recruitment
                  <br />
                  Management System
                </p>
              </div>

              {/* Orange Divider */}
              <div className="mb-8 h-1 w-12 bg-[#FF6B00] mx-auto" />

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[#1a1a2e]"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      autoComplete="email"
                      className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] pl-12 text-[#1a1a2e] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500 font-medium">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="block text-sm font-semibold text-[#1a1a2e]"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] pl-12 pr-12 text-[#1a1a2e] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1a1a2e] transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 font-medium">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1a1a2e]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-[#E5E7EB] accent-[#FF6B00] cursor-pointer"
                    />
                    Remember me
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-semibold text-[#FF6B00] hover:text-[#e86000] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="h-11 w-full rounded-lg bg-[#FF6B00] text-white font-semibold hover:bg-[#e86000] transition-colors text-base flex items-center justify-center gap-2"
                >
                  Sign In
                  <svg
                    className="h-5 w-5"
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
                  className="font-semibold text-[#FF6B00] hover:text-[#e86000] transition-colors"
                >
                  HR Support
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/20 bg-black/30 backdrop-blur-sm px-6 py-4 sm:px-8 text-center text-xs text-white/70">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <p>© 2025 SRJ Group. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="#" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>|</span>
            <Link to="#" className="hover:text-white transition-colors">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
