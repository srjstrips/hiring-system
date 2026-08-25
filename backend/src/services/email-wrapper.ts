import { prisma } from '@/config/database';

interface Branding {
  companyName: string;
  logoUrl?: string | null;
  primaryColor: string;
  footerText?: string | null;
  websiteUrl?: string | null;
}

let brandingCache: Branding | null = null;
let brandingCachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getBranding(): Promise<Branding> {
  if (brandingCache && Date.now() - brandingCachedAt < CACHE_TTL_MS) {
    return brandingCache;
  }
  try {
    const row = await prisma.emailBranding.findFirst();
    brandingCache = row ?? { companyName: 'SRJ Group', primaryColor: '#b45309' };
    brandingCachedAt = Date.now();
  } catch {
    brandingCache = { companyName: 'SRJ Group', primaryColor: '#b45309' };
  }
  return brandingCache!;
}

export function clearBrandingCache() {
  brandingCache = null;
}

export async function wrapEmail(bodyHtml: string): Promise<string> {
  const b = await getBranding();
  const primary = b.primaryColor || '#b45309';
  const logoHtml = b.logoUrl
    ? `<img src="${b.logoUrl}" alt="${b.companyName}" style="max-height:56px;max-width:200px;object-fit:contain;" />`
    : `<span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${b.companyName}</span>`;
  const footerLine = b.footerText || `© ${new Date().getFullYear()} ${b.companyName}. All rights reserved.`;
  const websiteLink = b.websiteUrl
    ? `<a href="${b.websiteUrl}" style="color:${primary};text-decoration:none;">${b.websiteUrl.replace(/^https?:\/\//, '')}</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,${primary} 0%,${darken(primary)} 100%);padding:28px 36px;text-align:center;">
            ${logoHtml}
            <div style="margin-top:8px;">
              <span style="font-size:12px;color:rgba(255,255,255,0.75);letter-spacing:1.5px;text-transform:uppercase;">Hiring &amp; Recruitment</span>
            </div>
          </td>
        </tr>

        <!-- DECORATIVE STRIP -->
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,${primary},#f59e0b,${primary});"></td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;color:#1f2937;font-size:15px;line-height:1.7;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr>
          <td style="background:#ffffff;padding:0 40px;">
            <div style="border-top:1px solid #e5e7eb;"></div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#6b7280;font-size:12px;">${footerLine}</p>
            ${websiteLink ? `<p style="margin:4px 0 0;font-size:12px;">${websiteLink}</p>` : ''}
            <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">Please do not reply to this email. This is an automated message.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Simple hex darkening for gradient — shifts each channel down by ~20% */
function darken(hex: string): string {
  try {
    const h = hex.replace('#', '');
    const r = Math.max(0, parseInt(h.slice(0, 2), 16) - 40);
    const g = Math.max(0, parseInt(h.slice(2, 4), 16) - 30);
    const b = Math.max(0, parseInt(h.slice(4, 6), 16) - 20);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch {
    return hex;
  }
}
