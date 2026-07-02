import { cache } from 'react';

const INTERNAL_API = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_HOST = process.env.API_HOST || '';

export const getPublicSettings = cache(async (): Promise<Record<string, string>> => {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (API_HOST) headers['Host'] = API_HOST;
    const res = await fetch(`${INTERNAL_API}/public/settings`, {
      next: { revalidate: 300 },
      headers,
    });
    if (!res.ok) return {};
    const data = await res.json();
    const flat: Record<string, string> = {};
    Object.values(data).forEach((group: any) => {
      if (typeof group === 'object' && group !== null) {
        Object.entries(group).forEach(([key, value]) => {
          flat[key] = value as string;
        });
      }
    });
    return flat;
  } catch {
    return {};
  }
});
