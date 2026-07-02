import { Metadata } from 'next';
import { generateMeta, generateCollectionPageSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { getPublicSettings } from '@/lib/settings';
import ProductListingClient from './ProductListingClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

export default function ProductListingPage() {
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
      <ProductListingClient />
    </div>
  );
}
