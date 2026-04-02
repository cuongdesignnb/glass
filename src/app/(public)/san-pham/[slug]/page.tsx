import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { generateMeta, generateProductSchema, generateBreadcrumbSchema } from '@/lib/seo';
import Breadcrumb from '@/components/layout/Breadcrumb';
import ProductDetailClient from './ProductDetailClient';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_MEDIA_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function getProduct(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/public/products/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getProductReviews(productId: number) {
  try {
    const res = await fetch(`${API_BASE}/public/products/${productId}/reviews?per_page=5`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) {
    return { title: 'Sản phẩm không tìm thấy' };
  }

  const images = product.images?.map((img: string) =>
    img.startsWith('http') ? img : `${API_MEDIA_URL}${img}`
  ) || [];

  return generateMeta({
    title: product.meta_title || product.name,
    description: product.meta_desc || product.description || `Mua ${product.name} chính hãng tại Glass Eyewear. Giá tốt, bảo hành 12 tháng.`,
    keywords: product.meta_keywords || `${product.name}, kính mắt, glass eyewear`,
    ogImage: product.og_image || images[0],
    url: `/san-pham/${product.slug}`,
    type: 'product',
  });
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const reviewData = await getProductReviews(product.id);

  const images = product.images?.map((img: string) =>
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
    price: Number(product.price),
    salePrice: product.sale_price ? Number(product.sale_price) : undefined,
    url: `/san-pham/${product.slug}`,
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
    <div style={{ paddingTop: 'var(--header-height)' }}>
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
