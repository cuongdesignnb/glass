import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { generateMeta, generateArticleSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { getPublicSettings } from '@/lib/settings';
import ArticleDetailClient from './ArticleDetailClient';
import '../articles.css';

export const revalidate = 3600;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const INTERNAL_API = process.env.INTERNAL_API_URL || '';
const API_HOST = process.env.API_HOST || '';
const SSR_API = INTERNAL_API || API_BASE;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_MEDIA_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '');

function ssrHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (INTERNAL_API && API_HOST) h['Host'] = API_HOST;
  return h;
}

async function getArticle(slug: string) {
  try {
    const res = await fetch(`${SSR_API}/public/articles/${slug}`, {
      headers: ssrHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getRelatedArticles(articleId: number, tags: string[]) {
  try {
    const params = new URLSearchParams({ per_page: '3', exclude: String(articleId) });
    if (tags[0]) params.set('tag', tags[0]);
    const res = await fetch(`${SSR_API}/public/articles?${params.toString()}`, {
      headers: ssrHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).filter((a: any) => a.id !== articleId).slice(0, 3);
  } catch {
    return [];
  }
}

function buildImageUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_MEDIA_URL}${path}`;
}

// Inject IDs into HTML headings for TOC (runs on server)
function injectHeadingIds(html: string): string {
  let i = 0;
  return html.replace(/<(h[23])[^>]*>/gi, (_match, tag) => {
    return `<${tag} id="heading-${i++}">`;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) {
    return { title: 'Bài viết không tìm thấy' };
  }

  const ogImage = article.thumbnail ? buildImageUrl(article.thumbnail) : undefined;
  const settings = await getPublicSettings();
  const siteName = settings['site_name'] || 'Glass Eyewear';

  return await generateMeta({
    title: article.meta_title || article.title,
    description: article.meta_desc || article.excerpt || `${article.title} - ${siteName}`,
    keywords: article.meta_keywords || article.tags?.join(', '),
    ogImage,
    url: `/bai-viet/${article.slug}`,
    type: 'article',
  });
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const related = await getRelatedArticles(article.id, article.tags || []);

  // Process content: inject heading IDs for TOC
  const processedContent = article.content ? injectHeadingIds(article.content) : '';

  const settings = await getPublicSettings();
  const siteName = settings['site_name'] || 'Glass Eyewear';

  // Schema: Article
  const articleSchema = await generateArticleSchema({
    title: article.title,
    description: article.excerpt || article.title,
    image: article.thumbnail ? buildImageUrl(article.thumbnail) : undefined,
    author: article.author_name || article.author || siteName,
    publishedAt: article.published_at || article.created_at,
    updatedAt: article.updated_at,
    url: `/bai-viet/${slug}`,
  });

  // Schema: Breadcrumb
  const breadcrumbItems = [
    { name: 'Trang chủ', url: '/' },
    { name: 'Bài viết', url: '/bai-viet' },
    { name: article.title, url: `/bai-viet/${slug}` },
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  return (
    <div style={{ paddingTop: 'var(--header-height)' }}>
      {/* Schema: Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {/* Schema: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ArticleDetailClient
        article={article}
        related={related}
        processedContent={processedContent}
      />
    </div>
  );
}
