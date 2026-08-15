import { Metadata } from 'next';
import { generateMeta, generateCollectionPageSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { getPublicSettings } from '@/lib/settings';
import { publicApi } from '@/lib/api';
import { normalizeProductSearchParams, productApiParams, productListingCanonicalPolicy, productListingUrl, type RawSearchParams } from '@/lib/listing-params';
import ProductListingClient from './ProductListingClient';

export async function generateMetadata({ searchParams = {} }: { searchParams?: RawSearchParams }): Promise<Metadata> {
  const settings = await getPublicSettings();
  const siteName = settings['site_name'] || 'MITOO';
  const seoPolicy = productListingCanonicalPolicy(searchParams);
  return await generateMeta({
    title: 'Bộ Sưu Tập Kính Mắt',
    description: 'Khám phá bộ sưu tập kính mắt thời trang cao cấp. Kính cận, kính râm, kính thời trang đa dạng kiểu dáng. Miễn phí vận chuyển.',
    keywords: `kính mắt, kính cận, kính râm, kính thời trang, mắt kính, ${siteName.toLowerCase()}, mua kính online`,
    url: seoPolicy.canonicalUrl,
    robots: seoPolicy.robots,
  });
}

export const revalidate = 60;

export default async function ProductListingPage({ searchParams = {} }: { searchParams?: RawSearchParams }) {
  const filters = normalizeProductSearchParams(searchParams);
  const seoPolicy = productListingCanonicalPolicy(searchParams);
  const [productResponse, categoryResponse, attributeResponse] = await Promise.all([
    publicApi.getProducts(productApiParams(filters)).catch(() => ({ data: [], current_page: 1, last_page: 1, total: 0 })),
    publicApi.getCategories(false).catch(() => []),
    publicApi.getProductAttributes().catch(() => ({})),
  ]);
  const products = Array.isArray(productResponse?.data) ? productResponse.data : [];
  const categories = Array.isArray(categoryResponse)
    ? categoryResponse.filter((category: any) => category.is_active !== false)
    : [];
  const pagination = {
    currentPage: Number(productResponse?.current_page) || 1,
    lastPage: Number(productResponse?.last_page) || 1,
    total: Number(productResponse?.total) || 0,
  };
  const listingUrl = productListingUrl(filters);
  const breadcrumbItems = [
    { name: 'Trang chủ', url: '/' },
    { name: 'Sản phẩm', url: '/san-pham' },
  ];

  const collectionSchema = generateCollectionPageSchema({
    name: 'Bộ Sưu Tập Kính Mắt',
    description: 'Khám phá bộ sưu tập kính mắt thời trang cao cấp.',
    url: seoPolicy.canonicalUrl,
  });

  return (
    <div style={{ paddingTop: 'var(--header-height)' }}>
      {/* Schema: CollectionPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      {/* Schema: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBreadcrumbSchema(breadcrumbItems)) }}
      />
      <ProductListingClient
        key={listingUrl}
        initialProducts={products}
        initialPagination={pagination}
        initialCategories={categories}
        initialAttributes={attributeResponse && typeof attributeResponse === 'object' ? attributeResponse : {}}
        initialFilters={filters}
      />
    </div>
  );
}
