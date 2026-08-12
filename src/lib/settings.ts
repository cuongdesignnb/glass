import { cache } from 'react';
import { flattenSettings } from './settingsUtils';

const INTERNAL_API = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_HOST = process.env.API_HOST || '';

async function loadPublicSettings(cacheMode: 'revalidate' | 'no-store'): Promise<Record<string, string>> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (API_HOST) headers['Host'] = API_HOST;
    const freshQuery = cacheMode === 'no-store' ? `?fresh=${Date.now()}` : '';
    const res = cacheMode === 'no-store'
      ? await fetch(`${INTERNAL_API}/public/settings${freshQuery}`, { cache: 'no-store', headers })
      : await fetch(`${INTERNAL_API}/public/settings`, { next: { revalidate: 300 }, headers });
    if (!res.ok) return {};
    const data = await res.json();
    return flattenSettings(data);
  } catch {
    return {};
  }
}

export const getPublicSettings = cache(async (): Promise<Record<string, string>> => {
  return loadPublicSettings('revalidate');
});

/** Read settings without Next's data cache (used by the favicon endpoint). */
export async function getFreshPublicSettings(): Promise<Record<string, string>> {
  return loadPublicSettings('no-store');
}
