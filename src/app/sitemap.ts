import { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn';
const INTERNAL_API = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_HOST = process.env.API_HOST || '';

function ssrHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (process.env.INTERNAL_API_URL && API_HOST) headers.Host = API_HOST;
  return headers;
}

async function fetchAll<T>(endpoint: string): Promise<T[]> {
  try {
    const response = await fetch(`${INTERNAL_API}${endpoint}`, {
      next: { revalidate: 3600 },
      headers: ssrHeaders(),
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
    { url: `${APP_URL}/faq`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${APP_URL}/thu-kinh-ao`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${APP_URL}/voucher`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ];

  const [products, articles, collections] = await Promise.all([
    fetchAll<any>('/public/products?per_page=1000'),
    fetchAll<any>('/public/articles?per_page=1000&published_only=1'),
    fetchAll<any>('/public/collections'),
  ]);

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

  return [...staticPages, ...collectionUrls, ...productUrls, ...articleUrls];
}
