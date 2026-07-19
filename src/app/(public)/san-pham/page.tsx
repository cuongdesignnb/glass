import { Metadata } from 'next';
import { generateMeta, generateCollectionPageSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { getPublicSettings } from '@/lib/settings';
import { publicApi } from '@/lib/api';
import { normalizeProductSearchParams, productApiParams, productListingUrl, type RawSearchParams } from '@/lib/listing-params';
import ProductListingClient from './ProductListingClient';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const siteName = settings['site_name'] || 'Glass Eyewear';
  return await generateMeta({
    title: 'Bộ Sưu Tập Kính Mắt',
    description: 'Khám phá bộ sưu tập kính mắt thời trang cao cấp. Kính cận, kính râm, kính thời trang đa dạng kiểu dáng. Miễn phí vận chuyển.',
    keywords: `kính mắt, kính cận, kính râm, kính thời trang, mắt kính, ${siteName.toLowerCase()}, mua kính online`,
    url: '/san-pham',
  });
}

export const revalidate = 60;

export default async function ProductListingPage({ searchParams = {} }: { searchParams?: RawSearchParams }) {
  const filters = normalizeProductSearchParams(searchParams);
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
  const canonicalUrl = productListingUrl(filters);
  const breadcrumbItems = [
    { name: 'Trang chủ', url: '/' },
    { name: 'Sản phẩm', url: '/san-pham' },
  ];

  const collectionSchema = generateCollectionPageSchema({
    name: 'Bộ Sưu Tập Kính Mắt',
    description: 'Khám phá bộ sưu tập kính mắt thời trang cao cấp.',
    url: '/san-pham',
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
        key={canonicalUrl}
        initialProducts={products}
        initialPagination={pagination}
        initialCategories={categories}
        initialAttributes={attributeResponse && typeof attributeResponse === 'object' ? attributeResponse : {}}
        initialFilters={filters}
      />
    </div>
  );
}
