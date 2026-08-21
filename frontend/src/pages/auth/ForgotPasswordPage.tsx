import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

const inputClass =
  'h-11 rounded-xl border-[#E2E8F0] bg-white pl-10 text-[#111827] placeholder:text-slate-400 focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/25 focus-visible:ring-offset-0';

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

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    await authService.forgotPassword(values.email).catch(() => null);
    setSent(true);
  };

  return (
    <div className="grid min-h-screen bg-white text-[#111827] md:grid-cols-[7fr_3fr]">
      <div className="relative hidden md:block">
        <img
          src="/career-assets/signup-login-bg.png"
          alt="SRJ — building tomorrow together"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <SrjWordmark />
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-[#111827]">Reset Password</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Enter your email and we'll send a reset link
              </p>
            </div>

            {sent ? (
              <div className="space-y-5 text-center">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF7F2]">
                    <Mail className="h-8 w-8 text-[#FF6B00]" />
                  </div>
                </div>
                <p className="text-sm text-[#64748B]">
                  If an account with that email exists, you'll receive a reset link shortly.
                </p>
                <Link to="/careers/login" className="block">
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-xl border-[#FF6B00] text-[#FF6B00] hover:bg-[#FFF7F2] hover:text-[#FF6B00]"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#111827]">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FF6B00]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      className={inputClass}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#FF6B00] text-white hover:bg-[#e85f00]"
                  loading={isSubmitting}
                >
                  Send Reset Link
                </Button>
                <Link
                  to="/careers/login"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#111827]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
