import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, type CSSProperties } from 'react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { publicApi } from '@/lib/api';
import { generateBreadcrumbSchema, generateMeta } from '@/lib/seo';
import '../../san-pham/products.css';
import './collection.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn';
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

const getCollection = cache(async (slug: string) => {
  try {
    return await publicApi.getCollection(slug);
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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const collection = await getCollection(params.slug);
  if (!collection) return {};

  return generateMeta({
    title: collection.name,
    description: collection.description || `Khám phá các sản phẩm trong bộ sưu tập ${collection.name}.`,
    ogImage: mediaUrl(collection.image) || undefined,
    url: `/bo-suu-tap/${collection.slug}`,
  });
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = await getCollection(params.slug);
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
