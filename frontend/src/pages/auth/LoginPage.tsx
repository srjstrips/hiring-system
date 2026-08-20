import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';
import { DoodleBackdrop } from '@/components/common/DoodleBackdrop';

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

function SrjWordmark() {
  return (
    <div className="flex flex-col items-center">
      <img
        src="/career-assets/srj-logo-dark.png"
        alt="SRJ"
        className="h-16 w-auto sm:h-20"
      />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FF6B00]">
        Building Tomorrow Together
      </p>
    </div>
  );
}

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

  const inputClass =
    'h-11 rounded-xl border-[#E2E8F0] bg-white pl-10 text-[#111827] placeholder:text-slate-400 focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/25 focus-visible:ring-offset-0';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-[#111827]">
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#FFF7F2]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#FFF7F2]" />
      <DoodleBackdrop className="pointer-events-none absolute inset-0 h-full w-full opacity-90" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid flex-1 items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
          <section className="flex flex-col items-center text-center">
            <SrjWordmark />
            <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome <span className="text-[#FF6B00]">Back!</span>
            </h1>
            <p className="mt-3 max-w-sm rounded-lg bg-white/70 px-3 py-1 text-sm leading-relaxed text-[#64748B] backdrop-blur-[2px]">
              Sign in to your HR dashboard and manage your hiring process seamlessly.
            </p>
          </section>

          <section className="w-full">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#111827]">HR Login</h2>
                <p className="mt-1 text-sm text-[#64748B]">Enter your credentials to access your account</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
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
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#111827]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#111827]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-[#E2E8F0] accent-[#FF6B00]"
                    />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="text-sm font-medium text-[#FF6B00] hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="h-11 w-full rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
                >
                  Login
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E2E8F0]" />
                <span className="text-sm text-[#64748B]">or</span>
                <div className="h-px flex-1 bg-[#E2E8F0]" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl border-[#FF6B00] bg-white text-[#FF6B00] hover:bg-[#FFF7F2] hover:text-[#FF6B00]"
                onClick={() => navigate('/careers/login')}
              >
                <User className="h-4 w-4" />
                Login as Candidate
              </Button>
            </div>
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-[#64748B]">© 2026 SRJ Group. All rights reserved.</p>
      </div>
    </div>
  );
}
