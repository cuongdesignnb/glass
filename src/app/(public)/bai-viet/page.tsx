import { Metadata } from 'next';
import { generateMeta, generateCollectionPageSchema, generateBreadcrumbSchema } from '@/lib/seo';
import ArticleListingClient from './ArticleListingClient';
import './articles.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: 'Bài Viết & Kiến Thức Kính Mắt',
    description: 'Khám phá xu hướng kính mắt mới nhất, mẹo chăm sóc, kiến thức chuyên sâu và đánh giá từ các chuyên gia. Cập nhật liên tục.',
    keywords: 'bài viết kính mắt, kiến thức kính, xu hướng kính, chăm sóc kính, tư vấn kính mắt',
    url: '/bai-viet',
  });
}

export default function ArticlesPage() {
  const breadcrumbItems = [
    { name: 'Trang chủ', url: '/' },
    { name: 'Bài viết', url: '/bai-viet' },
  ];

  const collectionSchema = generateCollectionPageSchema({
    name: 'Bài Viết & Kiến Thức Kính Mắt',
    description: 'Khám phá xu hướng kính mắt mới nhất, mẹo chăm sóc và kiến thức chuyên sâu.',
    url: '/bai-viet',
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
      <ArticleListingClient />
    </div>
  );
}
