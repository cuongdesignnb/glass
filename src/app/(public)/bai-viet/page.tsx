import { Metadata } from 'next';
import { generateMeta, generateCollectionPageSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { publicApi } from '@/lib/api';
import { articleApiParams, articleListingUrl, normalizeArticleSearchParams, type RawSearchParams } from '@/lib/listing-params';
import ArticleListingClient from './ArticleListingClient';
import './articles.css';

export async function generateMetadata(): Promise<Metadata> {
  return await generateMeta({
    title: 'Bài Viết & Kiến Thức Kính Mắt',
    description: 'Khám phá xu hướng kính mắt mới nhất, mẹo chăm sóc, kiến thức chuyên sâu và đánh giá từ các chuyên gia. Cập nhật liên tục.',
    keywords: 'bài viết kính mắt, kiến thức kính, xu hướng kính, chăm sóc kính, tư vấn kính mắt',
    url: '/bai-viet',
  });
}

export const revalidate = 60;

export default async function ArticlesPage({ searchParams = {} }: { searchParams?: RawSearchParams }) {
  const filters = normalizeArticleSearchParams(searchParams);
  const [articleResponse, categoryResponse] = await Promise.all([
    publicApi.getArticles(articleApiParams(filters)).catch(() => ({ data: [], current_page: 1, last_page: 1, total: 0 })),
    publicApi.getArticleCategories({}).catch(() => []),
  ]);
  const articles = Array.isArray(articleResponse?.data) ? articleResponse.data : [];
  const categories = Array.isArray(categoryResponse)
    ? categoryResponse.filter((category: any) => category.is_active !== false)
    : [];
  const pagination = {
    currentPage: Number(articleResponse?.current_page) || 1,
    lastPage: Number(articleResponse?.last_page) || 1,
    total: Number(articleResponse?.total) || 0,
  };
  const canonicalUrl = articleListingUrl(filters);
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
      <ArticleListingClient
        key={canonicalUrl}
        initialArticles={articles}
        initialPagination={pagination}
        initialCategories={categories}
        initialFilters={filters}
      />
    </div>
  );
}
