export function normalizeShowImagePath(imagePath?: string | null): string | undefined {
  const value = imagePath?.trim();
  if (!value) return undefined;

  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith('/shows/') || value.startsWith('shows/')) {
    let cleaned = value;
    while (cleaned.startsWith('/shows/')) cleaned = cleaned.slice('/shows/'.length);
    while (cleaned.startsWith('shows/')) cleaned = cleaned.slice('shows/'.length);
    cleaned = cleaned.replace(/^\/+/, '');
    return `/shows/${cleaned}`;
  }

  if (value.startsWith('/')) return value;

  return `/shows/${value}`;
}
