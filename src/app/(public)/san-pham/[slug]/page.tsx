import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { generateMeta, generateProductSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { getPublicSettings } from '@/lib/settings';
import Breadcrumb from '@/components/layout/Breadcrumb';
import ProductDetailClient from './ProductDetailClient';

export const revalidate = 60;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const INTERNAL_API = process.env.INTERNAL_API_URL || '';
const API_HOST = process.env.API_HOST || '';
const SSR_API = INTERNAL_API || API_BASE; // SSR dùng internal URL tránh server tự gọi chính nó
const API_MEDIA_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function ssrHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (INTERNAL_API && API_HOST) h['Host'] = API_HOST;
  return h;
}

async function getProduct(slug: string) {
  const url = `${SSR_API}/public/products/${slug}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: ssrHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.status === 404) return null; // Product genuinely doesn't exist
    if (!res.ok) {
      console.error(`[SSR getProduct] API error ${res.status} for ${slug}`);
      return null; // Other errors — will trigger notFound() which is better than 500
    }
    return res.json();
  } catch (err: any) {
    console.error('[SSR getProduct] FETCH ERROR:', err.message);
    return null;
  }
}

async function getProductReviews(productId: number) {
  try {
    const res = await fetch(`${SSR_API}/public/products/${productId}/reviews?per_page=5`, {
      headers: ssrHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ color?: string; option_ids?: string }> | { color?: string; option_ids?: string };
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return { title: 'Sản phẩm không tìm thấy' };
  }

  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : (searchParams || {});
  const color = resolvedSearchParams.color;
  const optionIdsStr = resolvedSearchParams.option_ids;
  const optionIds = optionIdsStr ? optionIdsStr.split(',').map(id => parseInt(id, 10)).filter(Boolean) : [];

  const optionNames: string[] = [];
  if (product.addon_groups && optionIds.length > 0) {
    product.addon_groups.forEach((group: any) => {
      (group.options || []).forEach((opt: any) => {
        if (optionIds.includes(opt.id)) {
          optionNames.push(opt.name);
        }
      });
    });
  }

  const suffixParts = [];
  if (color) suffixParts.push(color);
  suffixParts.push(...optionNames);
  const variantTitle = suffixParts.length > 0 ? `${product.name} - ${suffixParts.join(' - ')}` : product.name;

  const selectedVariant = product.color_variants?.find((variant: any) =>
    color && (variant.color === color || variant.color_name?.toLowerCase() === color.toLowerCase())
  );
  const imageSources = selectedVariant?.images?.length
    ? Array.from(new Set([...(selectedVariant.images || []), ...(product.images || [])]))
    : product.images;
  const images = imageSources?.map((img: string) =>
    img.startsWith('http') ? img : `${API_MEDIA_URL}${img}`
  ) || [];

  const settings = await getPublicSettings();
  const siteName = settings['site_name'] || 'Glass Eyewear';

  return await generateMeta({
    title: product.meta_title || variantTitle,
    description: product.meta_desc || product.description || `Mua ${variantTitle} chính hãng tại ${siteName}. Giá tốt, bảo hành 12 tháng.`,
    keywords: product.meta_keywords || `${product.name}, kính mắt, ${siteName.toLowerCase()}`,
    ogImage: product.og_image || images[0],
    url: `/san-pham/${product.slug}`,
    type: 'product',
  });
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ color?: string; option_ids?: string }> | { color?: string; option_ids?: string };
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : (searchParams || {});
  const color = resolvedSearchParams.color;
  const optionIdsStr = resolvedSearchParams.option_ids;
  const optionIds = optionIdsStr ? optionIdsStr.split(',').map(id => parseInt(id, 10)).filter(Boolean) : [];

  let addonTotal = 0;
  if (product.addon_prices && optionIds.length > 0) {
    const priceMap: Record<number, number> = {};
    (product.addon_prices || []).forEach((p: any) => {
      priceMap[p.option_id] = Number(p.additional_price) || 0;
    });
    optionIds.forEach((id) => {
      addonTotal += priceMap[id] || 0;
    });
  }

  const basePrice = Number(product.price) + addonTotal;
  const salePrice = product.sale_price ? Number(product.sale_price) + addonTotal : undefined;

  const queryParams: string[] = [];
  if (color) queryParams.push(`color=${encodeURIComponent(color)}`);
  if (optionIdsStr) queryParams.push(`option_ids=${encodeURIComponent(optionIdsStr)}`);
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  const schemaUrl = `/san-pham/${product.slug}${queryString}`;

  const reviewData = await getProductReviews(product.id);

  const selectedVariant = product.color_variants?.find((variant: any) =>
    color && (variant.color === color || variant.color_name?.toLowerCase() === color.toLowerCase())
  );
  const imageSources = selectedVariant?.images?.length
    ? Array.from(new Set([...(selectedVariant.images || []), ...(product.images || [])]))
    : product.images;
  const images = imageSources?.map((img: string) =>
    img.startsWith('http') ? img : `${API_MEDIA_URL}${img}`
  ) || [];

  // Breadcrumb items
  const breadcrumbItems = [
    { name: 'Trang chủ', url: '/' },
    { name: 'Sản Phẩm', url: '/san-pham' },
  ];
  if (product.category) {
    breadcrumbItems.push({
      name: product.category.name,
      url: `/san-pham?category_id=${product.category.id}`,
    });
  }
  breadcrumbItems.push({ name: product.name, url: `/san-pham/${product.slug}` });

  // Product Schema
  const productSchema = generateProductSchema({
    name: product.name,
    description: product.description || '',
    image: images,
    sku: product.sku,
    brand: product.brand,
    price: basePrice,
    salePrice: salePrice,
    url: schemaUrl,
    inStock: product.stock > 0,
  });

  // Add AggregateRating if reviews exist
  if (reviewData?.stats?.count > 0) {
    (productSchema as any).aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviewData.stats.average,
      reviewCount: reviewData.stats.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // FAQ Schema
  let faqSchema = null;
  if (product.faqs && product.faqs.length > 0) {
    faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: product.faqs.map((faq: any) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
  }

  return (
    <div style={{ paddingTop: 'var(--header-height)', overflowX: 'hidden', maxWidth: '100vw' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {/* Schema: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBreadcrumbSchema(breadcrumbItems)) }}
      />
      <div className="container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-4xl)' }}>
        <Breadcrumb items={breadcrumbItems} />
        <ProductDetailClient
          product={product}
          reviewData={reviewData}
          apiMediaUrl={API_MEDIA_URL}
        />
      </div>
    </div>
  );
}
