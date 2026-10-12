import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { authService } from '@/services/auth.service';
import { candidateAuthApi } from '@/api/career';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    // Try both HR and candidate endpoints in parallel — whichever account exists sends the email.
    // Both always return 200, so errors are swallowed silently (no email enumeration).
    await Promise.allSettled([
      authService.forgotPassword(values.email),
      candidateAuthApi.forgotPassword(values.email),
    ]);
    setSent(true);
  };

  return (
    <div className="relative min-h-screen w-full bg-gray-100 overflow-hidden">
      {/* Background image — same as login page */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/career-assets/login-bg.png)' }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-end px-4 sm:px-6 lg:px-12">
        <div className="w-full max-w-md lg:max-w-sm">
          <div className="rounded-lg bg-white p-8 sm:p-10 shadow-2xl">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <img src="/career-assets/srj-logo-dark.png" alt="SRJ" className="h-14 w-auto" />
            </div>

            <div className="mb-6 text-center">
              <p className="text-sm font-semibold tracking-wide text-[#FF6B00]">Password Recovery</p>
              <h1 className="mt-2 text-2xl font-bold text-[#1a1a2e]">Reset Password</h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Enter your email and we'll send a reset link
              </p>
            </div>

            <div className="mb-6 flex justify-center">
              <div className="h-1 w-12 bg-[#FF6B00]" />
            </div>

            {sent ? (
              <div className="space-y-5 text-center">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF7F2]">
                    <Mail className="h-8 w-8 text-[#FF6B00]" />
                  </div>
                </div>
                <p className="text-sm text-[#6B7280]">
                  If an account with that email exists, you'll receive a reset link shortly. Check your inbox (and spam folder).
                </p>
                <Link to="/careers/login">
                  <Button className="h-11 w-full rounded-lg bg-[#FF6B00] text-white font-semibold hover:bg-[#e86000]">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-lg bg-[#FF6B00] text-white font-semibold hover:bg-[#e86000]"
                  loading={isSubmitting}
                >
                  Send Reset Link
                </Button>

                <Link
                  to="/careers/login"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-[#6B7280] hover:text-[#111827]"
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
