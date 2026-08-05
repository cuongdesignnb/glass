const DEFAULT_API_URL = 'http://localhost:8000/api';

/** Return the public origin for an API URL such as https://example.com/api. */
export function getMediaOrigin(apiUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL): string {
  return apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

/**
 * Resolve a setting value into a browser/server-fetchable media URL.
 * Settings may contain an absolute URL, /storage/... or a relative upload path.
 */
export function resolveMediaUrl(value: string, apiUrl?: string): string {
  const raw = value.trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  const origin = getMediaOrigin(apiUrl);
  const path = raw.startsWith('/') ? raw : `/${raw}`;

  if (path.startsWith('/storage/')) return `${origin}${path}`;
  return `${origin}/storage${path}`;
}

