import { notFound } from 'next/navigation';
import { generateMeta, generateBreadcrumbSchema } from '@/lib/seo';
import { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function getPage(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/public/pages/${slug}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await getPage(params.slug);
  if (!page) return {};
  return generateMeta({
    title: page.meta_title || page.title,
    description: page.meta_desc || `${page.title} - Glass Eyewear`,
    url: `/${page.slug}`,
  });
}

export default async function StaticPage({ params }: { params: { slug: string } }) {
  const page = await getPage(params.slug);
  if (!page) return notFound();

  const breadcrumbItems = [
    { name: 'Trang chủ', url: '/' },
    { name: page.title, url: `/${page.slug}` },
  ];

  // WebPage Schema
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.meta_desc || page.title,
    url: `${APP_URL}/${page.slug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Glass Eyewear',
      url: APP_URL,
    },
    dateModified: page.updated_at,
  };

  return (
    <div style={{ paddingTop: 'var(--header-height)' }}>
      {/* Schema: WebPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      {/* Schema: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBreadcrumbSchema(breadcrumbItems)) }}
      />

      <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', minHeight: '60vh' }}>
        <header style={{ marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
            {page.title}
          </h1>
        </header>

        {page.content ? (
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: page.content }}
            style={{
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.8,
              fontSize: '1.05rem',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
            <p>Noi dung dang duoc cap nhat...</p>
          </div>
        )}
      </div>
    </div>
  );
}
