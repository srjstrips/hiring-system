export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateUniqueSlug(base: string, suffix?: string): string {
  const slug = slugify(base);
  return suffix ? `${slug}-${suffix}` : slug;
}
