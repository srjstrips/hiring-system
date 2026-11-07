/**
 * Patches all full-HTML email templates in the DB to be Gmail dark mode safe.
 * - Strips ```html / ``` markdown fences if present
 * - Adds color-scheme meta tags
 * - Injects Gmail dark mode override CSS into existing <style> blocks
 * - Adds inline bgcolor / style overrides on .ew / .ec / .lh / .cnt divs
 *
 * Safe to re-run: skips templates that already have [data-ogsc] dark mode CSS.
 *
 * Run with:
 *   npx tsx src/modules/email-templates/fix-email-dark-mode.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORANGE = '#e36c09';

const DARK_MODE_CSS = `
    /* Gmail dark mode (u+#body targets Gmail's injected element) */
    u + #body .ew  { background-color:#f4f5f7 !important; }
    u + #body .ec  { background-color:#ffffff !important; }
    u + #body .lh  { background-color:#ffffff !important; }
    u + #body .cnt { background-color:#ffffff !important; color:#222222 !important; }
    u + #body .box { background-color:#fff8f1 !important; }
    u + #body .btn { background-color:${ORANGE} !important; color:#ffffff !important; }
    /* Apple Mail / other clients */
    [data-ogsc] .ew  { background-color:#f4f5f7 !important; }
    [data-ogsc] .ec  { background-color:#ffffff !important; }
    [data-ogsc] .lh  { background-color:#ffffff !important; }
    [data-ogsc] .cnt { background-color:#ffffff !important; color:#222222 !important; }
    [data-ogsc] .cnt p, [data-ogsc] .cnt li { color:#222222 !important; }
    [data-ogsc] .cnt strong { color:#111111 !important; }
    [data-ogsc] .box { background-color:#fff8f1 !important; }
    [data-ogsc] .btn { background-color:${ORANGE} !important; color:#ffffff !important; }`;

function stripMarkdownFences(html: string): string {
  return html
    .replace(/^\s*```html\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

function addColorSchemeMeta(html: string): string {
  if (html.includes('color-scheme')) return html;
  return html.replace(
    /<meta name="viewport"[^>]*>/i,
    (m) =>
      m +
      '\n  <meta name="color-scheme" content="light">' +
      '\n  <meta name="supported-color-schemes" content="light">',
  );
}

function addRootColorScheme(html: string): string {
  if (html.includes(':root')) return html;
  return html.replace(/<style>/i, '<style>\n    :root { color-scheme: light; }');
}

function injectDarkModeCSS(html: string): string {
  // Insert before the closing </style>
  return html.replace(/<\/style>/i, DARK_MODE_CSS + '\n  </style>');
}

function addBodyId(html: string): string {
  if (/id="body"/i.test(html)) return html;
  return html.replace(/<body\b/i, '<body id="body"');
}

function addBgcolorToBody(html: string): string {
  // Add bgcolor="#f4f5f7" to <body> if missing
  if (/bgcolor=/i.test(html.match(/<body[^>]*>/i)?.[0] ?? '')) return html;
  return html.replace(/<body\b([^>]*)>/i, (m, attrs) =>
    `<body${attrs} bgcolor="#f4f5f7" style="margin:0;padding:0;background-color:#f4f5f7;">`,
  );
}

function addInlineStyles(html: string): string {
  // Add inline background-color to key divs so email clients can't override via CSS alone
  html = html.replace(/<div class="ew">/g, '<div class="ew" style="background-color:#f4f5f7;">');
  html = html.replace(/<div class="ec">/g, '<div class="ec" style="background-color:#ffffff;">');
  html = html.replace(/<div class="lh">/g, '<div class="lh" style="background-color:#ffffff;">');
  html = html.replace(/<div class="cnt">/g, '<div class="cnt" style="background-color:#ffffff;color:#222222;">');
  return html;
}

async function main() {
  const templates = await prisma.emailTemplate.findMany();
  let fixed = 0;
  let skipped = 0;

  for (const t of templates) {
    let body = t.body;

    // 1. Strip markdown fences (production safety)
    const stripped = stripMarkdownFences(body);
    if (stripped !== body) {
      body = stripped;
      console.log(`  FENCE  stripped markdown fences: "${t.name}"`);
    }

    // 2. Only patch full HTML documents
    if (!/<!DOCTYPE/i.test(body)) {
      if (stripped !== t.body) {
        await prisma.emailTemplate.update({ where: { id: t.id }, data: { body } });
        fixed++;
      } else {
        skipped++;
      }
      continue;
    }

    // 3. Skip if already has dark mode CSS
    if (body.includes('[data-ogsc]')) {
      console.log(`  SKIP   already patched: "${t.name}"`);
      skipped++;
      continue;
    }

    // 4. Apply all patches
    body = addColorSchemeMeta(body);
    body = addRootColorScheme(body);
    body = injectDarkModeCSS(body);
    body = addBodyId(body);
    body = addBgcolorToBody(body);
    body = addInlineStyles(body);

    await prisma.emailTemplate.update({ where: { id: t.id }, data: { body } });
    console.log(`  FIXED  dark mode patched: "${t.name}" (${t.category})`);
    fixed++;
  }

  console.log(`\nDone. Fixed: ${fixed}  |  Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
