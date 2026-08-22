import { z } from 'zod';

export const signupSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const emptyToUndef = (v: unknown) => (v === '' ? undefined : v);

export const profileUpdateSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  alternatePhone: z.string().max(20).optional(),
  whatsappNumber: z.string().max(20).optional(),
  candidateType: z.enum(['FRESHER', 'EXPERIENCED']).optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().or(z.literal('')),
  dateOfBirth: z.preprocess(emptyToUndef, z.coerce.date().optional()),
  // Address
  currentLocation: z.string().max(150).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(12).optional(),
  currentAddress: z.string().max(300).optional(),
  permanentAddress: z.string().max(300).optional(),
  preferredLocation: z.string().max(150).optional(),
  languagesKnown: z.string().max(200).optional(),
  willingToRelocate: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.boolean().optional()),
  // Education
  highestQualification: z.string().max(150).optional(),
  instituteName: z.string().max(200).optional(),
  yearOfPassing: z.preprocess(emptyToUndef, z.coerce.number().int().min(1950).max(2100).optional()),
  percentageCgpa: z.string().max(20).optional(),
  certifications: z.string().max(1000).optional(),
  // Professional (experienced)
  currentCompany: z.string().max(150).optional(),
  currentDesignation: z.string().max(150).optional(),
  totalExperience: z.preprocess(emptyToUndef, z.coerce.number().min(0).max(60).optional()),
  currentSalary: z.preprocess(emptyToUndef, z.coerce.number().min(0).optional()),
  expectedSalary: z.preprocess(emptyToUndef, z.coerce.number().min(0).optional()),
  noticePeriodDays: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(365).optional()),
  // Links & summary
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  profileSummary: z.string().max(2000).optional(),
  // Verification (optional, sensitive)
  aadharNumber: z.string().max(20).optional(),
  panNumber: z.string().max(15).optional(),
});

export type SignupDto = z.infer<typeof signupSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type ProfileUpdateDto = z.infer<typeof profileUpdateSchema>;
