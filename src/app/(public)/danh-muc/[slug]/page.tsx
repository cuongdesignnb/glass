import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { generateBreadcrumbSchema, generateMeta } from '@/lib/seo';
import { formatPrice } from '@/lib/constants';
import { productApiParams, normalizeProductSearchParams, type RawSearchParams } from '@/lib/listing-params';
import '../../san-pham/products.css';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<RawSearchParams> | RawSearchParams };

function plainText(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
}

function containsHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*?>/i.test(value);
}

async function loadCategory(slug: string) {
  try { return await publicApi.getCategory(slug); } catch { return null; }
}

export async function generateMetadata({ params, searchParams = {} }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category || category.is_active === false) return { title: 'Category not found', robots: { index: false, follow: false } };
  const title = category.meta_title || `${category.name} | Kính mắt MITOO`;
  const description = category.meta_desc || plainText(category.description) || `Khám phá sản phẩm ${category.name} chính hãng tại MITOO.`;
  const resolved = searchParams instanceof Promise ? await searchParams : searchParams;
  const page = typeof resolved?.page === 'string' ? resolved.page : Array.isArray(resolved?.page) ? resolved.page[0] : '';
  const url = `/danh-muc/${encodeURIComponent(category.slug)}${page && page !== '1' ? `?page=${encodeURIComponent(page)}` : ''}`;
  return generateMeta({ title, description, url });
}

export default async function CategoryPage({ params, searchParams = {} }: Props) {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category || category.is_active === false) notFound();
  const resolved = searchParams instanceof Promise ? await searchParams : searchParams;
  const page = typeof resolved?.page === 'string' ? resolved.page : Array.isArray(resolved?.page) ? resolved.page[0] : '1';
  const filters = normalizeProductSearchParams({ category: category.slug, page });
  const response = await publicApi.getProducts(productApiParams(filters)).catch(() => ({ data: [], current_page: 1, last_page: 1, total: 0 }));
  const products = Array.isArray(response?.data) ? response.data : [];
  const currentPage = Number(response?.current_page) || 1;
  const lastPage = Number(response?.last_page) || 1;
  const canonical = `/danh-muc/${encodeURIComponent(category.slug)}${currentPage > 1 ? `?page=${currentPage}` : ''}`;
  const breadcrumb = [
    { name: 'Trang chủ', url: '/' },
    { name: 'Sản phẩm', url: '/san-pham' },
    { name: category.name, url: `/danh-muc/${encodeURIComponent(category.slug)}` },
  ];
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: plainText(category.description) || `Sản phẩm ${category.name}`,
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn'}${canonical}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: Number(response?.total) || products.length,
      itemListElement: products.map((product: any, index: number) => ({
        '@type': 'ListItem', position: index + 1,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn'}/san-pham/${product.slug}`,
        name: product.name,
      })),
    },
  };
  return <div style={{ paddingTop: 'var(--header-height)' }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBreadcrumbSchema(breadcrumb)) }} />
    <header className="products-header"><div className="container"><h1 className="heading-lg">{category.name}</h1>{category.description && <div className="category-description">{containsHtml(category.description) ? <div dangerouslySetInnerHTML={{ __html: category.description }} /> : <p>{category.description}</p>}</div>}</div></header>
    <main className="container" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-4xl)' }}>
      {products.length === 0 ? <p>Chưa có sản phẩm trong danh mục này.</p> : <div className="product-grid">
        {products.map((product: any, index: number) => <Link key={product.id} href={`/san-pham/${product.slug}`} className="product-card">
          <div className="product-card__image">{product.thumbnail ? <Image src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || ''}${product.thumbnail}`} alt={product.thumbnail_alt || product.name} fill priority={index === 0} sizes="(max-width: 768px) 50vw, 250px" style={{ objectFit: 'contain' }} /> : null}</div>
          <div className="product-card__info"><div className="product-card__category">{category.name}</div><h2 className="product-card__name">{product.name}</h2><div className="product-card__price"><span className="product-card__price-current">{formatPrice(product.sale_price || product.price)}</span></div></div>
        </Link>)}
      </div>}
      {lastPage > 1 && <nav className="pagination" aria-label="Category pagination">{Array.from({ length: lastPage }, (_, i) => i + 1).map((item) => <Link key={item} className={`pagination__btn ${item === currentPage ? 'pagination__btn--active' : ''}`} href={`/danh-muc/${encodeURIComponent(category.slug)}${item > 1 ? `?page=${item}` : ''}`} aria-current={item === currentPage ? 'page' : undefined}>{item}</Link>)}</nav>}
    </main>
  </div>;
}
