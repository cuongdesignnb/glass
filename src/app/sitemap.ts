import { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn';
const INTERNAL_API = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_HOST = process.env.API_HOST || '';

function ssrHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (process.env.INTERNAL_API_URL && API_HOST) headers.Host = API_HOST;
  return headers;
}

export function dedupeSitemapEntries(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const url = String(entry.url);
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function safeLastModified(value: unknown): Date {
  if (value) {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date;
  }

  return new Date();
}

async function fetchAll<T>(endpoint: string): Promise<T[]> {
  try {
    const response = await fetch(`${INTERNAL_API}${endpoint}`, {
      cache: 'no-store',
      headers: { ...ssrHeaders(), 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || data || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${APP_URL}/san-pham`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${APP_URL}/bo-suu-tap`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${APP_URL}/bai-viet`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${APP_URL}/gioi-thieu`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${APP_URL}/lien-he`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${APP_URL}/faq`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${APP_URL}/thu-kinh-ao`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${APP_URL}/voucher`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ];

  const [products, articles, collections, categories, pages] = await Promise.all([
    fetchAll<any>('/public/products?per_page=1000'),
    fetchAll<any>('/public/articles?per_page=1000&published_only=1'),
    fetchAll<any>('/public/collections'),
    fetchAll<any>('/public/categories?tree=false'),
    fetchAll<any>('/public/pages'),
  ]);

  const categoryUrls: MetadataRoute.Sitemap = Array.isArray(categories)
    ? categories.filter((category) => category?.slug && category?.is_active !== false).map((category) => ({
        url: `${APP_URL}/danh-muc/${category.slug}`,
        lastModified: category.updated_at ? new Date(category.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.78,
      }))
    : [];

  const productUrls: MetadataRoute.Sitemap = Array.isArray(products)
    ? products.filter((product) => product?.slug).map((product) => ({
        url: `${APP_URL}/san-pham/${product.slug}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
    : [];

  const articleUrls: MetadataRoute.Sitemap = Array.isArray(articles)
    ? articles.filter((article) => article?.slug).map((article) => ({
        url: `${APP_URL}/bai-viet/${article.slug}`,
        lastModified: article.updated_at ? new Date(article.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    : [];

  const collectionUrls: MetadataRoute.Sitemap = Array.isArray(collections)
    ? collections
        .filter((collection) => collection?.slug && collection?.is_active !== false)
        .map((collection) => ({
          url: `${APP_URL}/bo-suu-tap/${collection.slug}`,
          lastModified: collection.updated_at ? new Date(collection.updated_at) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.75,
        }))
    : [];

  const cmsPageUrls: MetadataRoute.Sitemap = Array.isArray(pages)
    ? pages
        .filter((page) => page?.slug && page?.is_published !== false)
        .flatMap((page) => {
          const slug = String(page.slug).trim().replace(/^\/+|\/+$/g, '');
          if (!slug) return [];

          return [{
            url: `${APP_URL}/${slug}`,
            lastModified: safeLastModified(page.updated_at),
            changeFrequency: 'weekly' as const,
            priority: 0.65,
          }];
        })
    : [];

  return dedupeSitemapEntries([
    ...staticPages,
    ...cmsPageUrls,
    ...categoryUrls,
    ...collectionUrls,
    ...productUrls,
    ...articleUrls,
  ]);
}
