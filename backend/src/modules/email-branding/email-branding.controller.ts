import { Response } from 'express';
import { prisma } from '@/config/database';
import { ApiResponse } from '@/utils/response';
import { asyncHandler } from '@/utils/asyncHandler';
import { clearBrandingCache } from '@/services/email-wrapper';
import type { AuthRequest } from '@/types';

export const getBranding = asyncHandler(async (_req: AuthRequest, res: Response) => {
  let row = await prisma.emailBranding.findFirst();
  if (!row) {
    row = await prisma.emailBranding.create({
      data: { companyName: 'SRJ Group', primaryColor: '#b45309' },
    });
  }
  return ApiResponse.success(res, row);
});

export const updateBranding = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { companyName, logoUrl, primaryColor, footerText, websiteUrl, isEnabled } = req.body as {
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
    footerText?: string;
    websiteUrl?: string;
    isEnabled?: boolean;
  };

  let row = await prisma.emailBranding.findFirst();
  if (!row) {
    row = await prisma.emailBranding.create({
      data: { companyName: 'SRJ Group', primaryColor: '#b45309' },
    });
  }

  const updated = await prisma.emailBranding.update({
    where: { id: row.id },
    data: {
      ...(companyName !== undefined && { companyName }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(footerText !== undefined && { footerText: footerText || null }),
      ...(websiteUrl !== undefined && { websiteUrl: websiteUrl || null }),
      ...(isEnabled !== undefined && { isEnabled }),
    },
  });

  clearBrandingCache();
  return ApiResponse.success(res, updated, 'Branding updated');
});
