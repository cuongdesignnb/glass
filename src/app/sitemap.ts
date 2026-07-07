import { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn';
const INTERNAL_API = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_HOST = process.env.API_HOST || '';

function ssrHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (process.env.INTERNAL_API_URL && API_HOST) h['Host'] = API_HOST;
  return h;
}

async function fetchAll<T>(endpoint: string): Promise<T[]> {
  try {
    const res = await fetch(`${INTERNAL_API}${endpoint}`, {
      next: { revalidate: 3600 },
      headers: ssrHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || data || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ─── Static pages ──────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${APP_URL}/san-pham`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${APP_URL}/bai-viet`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${APP_URL}/gioi-thieu`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${APP_URL}/faq`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${APP_URL}/thu-kinh-ao`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${APP_URL}/voucher`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ];

  // ─── Products ──────────────────────────────────────────────
  const products = await fetchAll<any>('/public/products?per_page=1000');
  const productUrls: MetadataRoute.Sitemap = Array.isArray(products)
    ? products.map((p) => ({
        url: `${APP_URL}/san-pham/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
    : [];

  // ─── Articles ──────────────────────────────────────────────
  const articles = await fetchAll<any>('/public/articles?per_page=1000');
  const articleUrls: MetadataRoute.Sitemap = Array.isArray(articles)
    ? articles.map((a) => ({
        url: `${APP_URL}/bai-viet/${a.slug}`,
        lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    : [];

  // ─── CMS Pages (static pages from admin) ──────────────────
  // Pages API doesn't have a list endpoint exposed publicly,
  // but if it's added in the future, fetch here.

  return [...staticPages, ...productUrls, ...articleUrls];
}
