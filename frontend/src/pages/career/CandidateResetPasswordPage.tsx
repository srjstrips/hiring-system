import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { candidateAuthApi } from '@/api/career';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function CandidateResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="relative min-h-screen w-full bg-gray-100 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/career-assets/login-bg.png)' }} />
        <div className="relative z-10 flex min-h-screen items-center justify-end px-4 sm:px-6 lg:px-12">
          <div className="w-full max-w-md lg:max-w-sm">
            <div className="rounded-lg bg-white p-8 shadow-2xl text-center space-y-4">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <h1 className="text-xl font-bold text-[#1a1a2e]">Invalid Reset Link</h1>
              <p className="text-sm text-[#6B7280]">This reset link is missing or invalid. Please request a new one.</p>
              <Link to="/forgot-password">
                <Button className="h-11 w-full rounded-lg bg-[#FF6B00] text-white font-semibold hover:bg-[#e86000]">
                  Request New Link
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      await candidateAuthApi.resetPassword(token, values.password);
      setDone(true);
    } catch (err: any) {
      setServerError(
        err.response?.data?.message ?? 'Something went wrong. Please request a new reset link.'
      );
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gray-100 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/career-assets/login-bg.png)' }} />

      <div className="relative z-10 flex min-h-screen items-center justify-end px-4 sm:px-6 lg:px-12">
        <div className="w-full max-w-md lg:max-w-sm">
          <div className="rounded-lg bg-white p-8 sm:p-10 shadow-2xl">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <img src="/career-assets/srj-logo-dark.png" alt="SRJ" className="h-14 w-auto" />
            </div>

            <div className="mb-6 text-center">
              <p className="text-sm font-semibold tracking-wide text-[#FF6B00]">Almost there</p>
              <h1 className="mt-2 text-2xl font-bold text-[#1a1a2e]">Set New Password</h1>
              <p className="mt-1 text-sm text-[#6B7280]">Choose a strong password for your account</p>
            </div>

            <div className="mb-6 flex justify-center">
              <div className="h-1 w-12 bg-[#FF6B00]" />
            </div>

            {done ? (
              <div className="space-y-5 text-center">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F0FDF4]">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-[#111827]">Password updated!</h2>
                <p className="text-sm text-[#6B7280]">Your password has been reset successfully. You can now log in with your new password.</p>
                <Link to="/careers/login">
                  <Button className="h-11 w-full rounded-lg bg-[#FF6B00] text-white font-semibold hover:bg-[#e86000]">
                    Go to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {serverError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {serverError}
                    {' '}
                    <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="block text-sm font-semibold text-[#111827]">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] pl-11 pr-11 text-[#111827] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#111827]">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] pl-11 pr-11 text-[#111827] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827]"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="h-11 w-full rounded-lg bg-[#FF6B00] text-white font-semibold hover:bg-[#e86000]"
                >
                  Set New Password
                </Button>

                <p className="text-center text-sm text-[#6B7280]">
                  Remember your password?{' '}
                  <Link to="/careers/login" className="font-semibold text-[#FF6B00] hover:text-[#e86000]">
                    Sign In
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
