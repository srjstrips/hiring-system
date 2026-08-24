import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';

const schema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export default function CandidateSignupPage() {
  const { signup } = useCandidateAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const redirect = searchParams.get('redirect') || '/careers/jobs';

  const onSubmit = async (values: FormValues) => {
    try {
      await signup(values);
      navigate(redirect);
    } catch (err: any) {
      toast({
        title: 'Signup failed',
        description: err.response?.data?.message ?? 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
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

      {/* Content - Signup Card on Right */}
      <div className="relative z-10 flex min-h-screen items-center justify-end px-4 sm:px-6 lg:px-12">
        <div className="w-full max-w-md lg:max-w-sm">
          {/* White Signup Card */}
          <div className="rounded-lg bg-white p-8 sm:p-10 shadow-2xl">
            {/* Card Header */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-[#1a1a2e]">
                Create Account
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                Sign up to apply for jobs and track your applications
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* First and Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="block text-sm font-semibold text-[#111827]">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    autoComplete="given-name"
                    className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] text-[#111827] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                    {...register('firstName')}
                  />
                  {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="block text-sm font-semibold text-[#111827]">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    autoComplete="family-name"
                    className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] text-[#111827] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                    {...register('lastName')}
                  />
                  {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="block text-sm font-semibold text-[#111827]">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  autoComplete="email"
                  className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] text-[#111827] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="block text-sm font-semibold text-[#111827]">
                  Phone (optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                  className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] text-[#111827] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                  {...register('phone')}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="block text-sm font-semibold text-[#111827]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] pl-4 pr-11 text-[#111827] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors hover:text-[#111827]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#111827]">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="h-11 rounded-lg border-[#E5E7EB] bg-[#F3F4F6] pl-4 pr-11 text-[#111827] placeholder:text-[#9CA3AF] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 focus-visible:ring-offset-0"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors hover:text-[#111827]"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
              </div>

              {/* Sign Up Button */}
              <Button
                type="submit"
                loading={isSubmitting}
                className="h-11 w-full rounded-lg bg-[#FF6B00] text-white font-semibold transition-colors hover:bg-[#e86000]"
              >
                Sign Up
              </Button>
            </form>

            {/* Login Link */}
            <p className="mt-6 text-center text-sm text-[#6B7280]">
              Already have an account?{' '}
              <Link
                to={`/careers/login?redirect=${encodeURIComponent(redirect)}`}
                className="font-semibold text-[#FF6B00] transition-colors hover:text-[#e86000]"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
