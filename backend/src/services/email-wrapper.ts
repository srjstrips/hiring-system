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
  const primary = b.primaryColor || '#e36c09';
  const logoUrl = b.logoUrl || 'https://careers.srjsteel.in/career-assets/srj-logo-dark.png';
  const companyName = b.companyName || 'SRJ Group';
  const websiteUrl = (b.websiteUrl || 'https://careers.srjsteel.in').replace(/\/$/, '');
  const websiteDisplay = websiteUrl.replace(/^https?:\/\//, '');
  const footerLine = b.footerText || `&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>Email</title>
  <style>
    :root { color-scheme: light; }
    body { margin:0; padding:0; background-color:#f4f5f7 !important; font-family:Arial,Helvetica,sans-serif; color:#222222; line-height:1.55; }
    img { border:0; outline:none; text-decoration:none; }
    a { color:${primary}; }
    /* Gmail dark mode — u+#body targets Gmail's injected element before the email */
    u + #body .ew  { background-color:#f4f5f7 !important; }
    u + #body .ec  { background-color:#ffffff !important; }
    u + #body .lh  { background-color:#ffffff !important; border-color:#eeeeee !important; }
    u + #body .cnt { background-color:#ffffff !important; color:#222222 !important; }
    u + #body .ft  { background-color:#f9f9f9 !important; color:#888888 !important; }
    /* Apple Mail / other clients that honour [data-ogsc] */
    [data-ogsc] .ew  { background-color:#f4f5f7 !important; }
    [data-ogsc] .ec  { background-color:#ffffff !important; }
    [data-ogsc] .lh  { background-color:#ffffff !important; border-color:#eeeeee !important; }
    [data-ogsc] .cnt { background-color:#ffffff !important; color:#222222 !important; }
    [data-ogsc] .cnt p, [data-ogsc] .cnt li { color:#222222 !important; }
    [data-ogsc] .cnt strong { color:#111111 !important; }
    [data-ogsc] .ft  { background-color:#f9f9f9 !important; color:#888888 !important; }
    @media only screen and (max-width:620px) {
      .cnt { padding:25px 20px !important; }
      .ft  { padding:16px 20px !important; }
    }
  </style>
</head>
<body id="body" bgcolor="#f4f5f7" style="margin:0;padding:0;background-color:#f4f5f7;">
  <table class="ew" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f5f7"
         style="background-color:#f4f5f7;padding:25px 10px;" role="presentation">
    <tr><td align="center">

      <table class="ec" width="680" cellpadding="0" cellspacing="0" bgcolor="#ffffff"
             style="max-width:680px;width:100%;background-color:#ffffff;" role="presentation">

        <!-- Logo header -->
        <tr>
          <td class="lh" align="center" bgcolor="#ffffff"
              style="background-color:#ffffff;padding:25px 20px;border-bottom:1px solid #eeeeee;">
            <a href="${websiteUrl}" target="_blank" style="text-decoration:none;display:block;">
              <img src="${logoUrl}" alt="${companyName}" width="190"
                   style="display:block;width:190px;max-width:80%;height:auto;margin:0 auto;" />
            </a>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="cnt" bgcolor="#ffffff"
              style="background-color:#ffffff;padding:35px 40px;font-size:14px;color:#222222;
                     font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
            ${bodyHtml}
            <p style="margin:28px 0 0;"><strong>Warm Regards,</strong></p>
            <p style="margin:4px 0 0;">
              <strong>Human Resources Department</strong><br/>
              <strong>${companyName}</strong><br/>
              Website:&nbsp;<a href="${websiteUrl}" target="_blank"
                style="color:${primary};text-decoration:underline;">${websiteDisplay}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="ft" align="center" bgcolor="#f9f9f9"
              style="background-color:#f9f9f9;padding:16px 30px;border-top:1px solid #eeeeee;
                     font-size:11px;color:#888888;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0 0 4px 0;">${footerLine}</p>
            <p style="margin:4px 0 0;">
              <a href="${websiteUrl}" target="_blank"
                 style="color:${primary};text-decoration:none;">${websiteDisplay}</a>
            </p>
            <p style="margin:6px 0 0;color:#aaaaaa;font-size:10px;">
              Please do not reply to this email. This is an automated message.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
