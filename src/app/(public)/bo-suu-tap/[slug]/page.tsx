import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache, type CSSProperties } from 'react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { generateBreadcrumbSchema, generateMeta } from '@/lib/seo';
import '../../san-pham/products.css';
import './collection.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn';
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
const INTERNAL_API = process.env.INTERNAL_API_URL || '';
const API_HOST = process.env.API_HOST || '';
const SSR_API = INTERNAL_API || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function ssrHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (INTERNAL_API && API_HOST) headers.Host = API_HOST;
  return headers;
}

type SearchParams = Record<string, string | string[] | undefined>;
type CollectionRedirect = { redirectTo: string };

function queryString(searchParams?: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (Array.isArray(value)) {
      value.forEach(item => query.append(key, item));
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

function isCollectionRedirect(value: any): value is CollectionRedirect {
  return Boolean(value && typeof value.redirectTo === 'string' && value.redirectTo.length > 0);
}

const getCollection = cache(async (slug: string, searchParams?: SearchParams) => {
  try {
    const response = await fetch(`${SSR_API}/public/collections/${encodeURIComponent(slug)}${queryString(searchParams)}`, {
      headers: ssrHeaders(),
      cache: 'no-store',
      redirect: 'manual',
    });
    if (response.status === 301 || response.status === 308) {
      const location = response.headers.get('location');
      return location ? { redirectTo: location } : null;
    }
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
});

function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

function formatPrice(value: number | string): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export const revalidate = 60;

export async function generateMetadata({ params, searchParams }: {
  params: { slug: string };
  searchParams?: Promise<SearchParams> | SearchParams;
}): Promise<Metadata> {
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : (searchParams || {});
  const collection = await getCollection(params.slug, resolvedSearchParams);
  if (!collection) return {};

  if (isCollectionRedirect(collection)) {
    return { alternates: { canonical: collection.redirectTo }, robots: { index: false, follow: false } };
  }

  return generateMeta({
    title: collection.name,
    description: collection.description || `Khám phá các sản phẩm trong bộ sưu tập ${collection.name}.`,
    ogImage: mediaUrl(collection.image) || undefined,
    url: `/bo-suu-tap/${collection.slug}`,
  });
}

export default async function CollectionPage({ params, searchParams }: {
  params: { slug: string };
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : (searchParams || {});
  const collection = await getCollection(params.slug, resolvedSearchParams);
  if (isCollectionRedirect(collection)) {
    permanentRedirect(collection.redirectTo);
  }
  if (!collection) notFound();

  const products = Array.isArray(collection.products)
    ? collection.products.filter((product: any) => product.is_active !== false)
    : [];
  const heroImage = mediaUrl(collection.image);
  const collectionUrl = `/bo-suu-tap/${collection.slug}`;
  const breadcrumbItems = [
    { name: 'Trang chủ', url: '/' },
    { name: 'Bộ sưu tập', url: '/bo-suu-tap' },
    { name: collection.name, url: collectionUrl },
  ];
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.name,
    description: collection.description || undefined,
    url: `${APP_URL}${collectionUrl}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.map((product: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${APP_URL}/san-pham/${product.slug}`,
        name: product.name,
      })),
    },
  };

  return (
    <div className="collection-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBreadcrumbSchema(breadcrumbItems)) }} />

      <section
        className="collection-hero"
        style={{
          '--collection-gradient-from': collection.gradient_from || '#f7f0e8',
          '--collection-gradient-to': collection.gradient_to || '#e8e0d4',
          '--collection-accent': collection.accent_color || 'var(--color-brand)',
        } as CSSProperties}
      >
        {heroImage && <Image src={heroImage} alt={collection.name} fill priority sizes="100vw" className="collection-hero__image" />}
        <div className="collection-hero__overlay" />
        <div className="container collection-hero__content">
          <Link href="/bo-suu-tap" className="collection-hero__back"><FiArrowLeft /> Tất cả bộ sưu tập</Link>
          {collection.tag && <span className="collection-hero__tag">{collection.tag}</span>}
          <h1>{collection.name}</h1>
          {collection.description && <p>{collection.description}</p>}
          <span className="collection-hero__count">{products.length} sản phẩm</span>
        </div>
      </section>

      <section className="section collection-products">
        <div className="container">
          {products.length > 0 ? (
            <div className="product-grid">
              {products.map((product: any, index: number) => {
                const thumbnail = mediaUrl(product.thumbnail || product.images?.[0]);
                return (
                  <Link key={product.id} href={`/san-pham/${product.slug}`} className="product-card">
                    <div className="product-card__image">
                      {thumbnail ? (
                        <Image src={thumbnail} alt={product.thumbnail_alt || product.name} fill priority={index === 0} sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 250px" style={{ objectFit: 'contain', objectPosition: 'center' }} />
                      ) : (
                        <div className="product-card__placeholder" aria-hidden="true" />
                      )}
                      <div className="product-card__badge">
                        {product.is_new && <span className="badge-new">Mới</span>}
                        {product.sale_price && <span className="badge-sale">Sale</span>}
                      </div>
                    </div>
                    <div className="product-card__info">
                      <div className="product-card__category">{product.category?.name || collection.name}</div>
                      <h2 className="product-card__name">{product.name}</h2>
                      <div className="product-card__price">
                        <span className="product-card__price-current">{formatPrice(product.sale_price || product.price)}</span>
                        {product.sale_price && <span className="product-card__price-original">{formatPrice(product.price)}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="collection-empty">
              <h2>Bộ sưu tập đang được cập nhật</h2>
              <p>Hiện chưa có sản phẩm công khai trong bộ sưu tập này.</p>
              <Link href="/san-pham" className="btn btn-primary">Xem tất cả sản phẩm <FiArrowRight /></Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
