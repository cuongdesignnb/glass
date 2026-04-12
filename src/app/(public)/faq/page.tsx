import { Metadata } from 'next';
import FaqClient from './FaqClient';
import { generateBreadcrumbSchema } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const INTERNAL_API = process.env.INTERNAL_API_URL || '';
const API_HOST = process.env.API_HOST || '';
const SSR_API = INTERNAL_API || API_BASE;

function ssrHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (INTERNAL_API && API_HOST) h['Host'] = API_HOST;
  return h;
}

export const metadata: Metadata = {
  title: 'Câu Hỏi Thường Gặp (FAQ) | Glass Eyewear',
  description: 'Tổng hợp các câu hỏi thường gặp về sản phẩm, bảo hành, chính sách mua hàng và ưu đãi tại Glass Eyewear.',
};

async function getFaqs() {
  try {
    const res = await fetch(`${SSR_API}/public/faqs`, {
      cache: 'no-store',
      headers: ssrHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function FAQPage() {
  const faqs = await getFaqs();

  // FAQ Schema for SEO
  const faqSchema = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq: any) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  } : null;

  return (
    <div style={{ paddingTop: 'var(--header-height)', background: 'var(--color-primary)', minHeight: '100vh' }}>
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {/* Schema: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBreadcrumbSchema([
            { name: 'Trang chủ', url: '/' },
            { name: 'Câu Hỏi Thường Gặp', url: '/faq' },
          ])),
        }}
      />
      <main style={{ padding: '60px 20px', minHeight: '80vh', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '10px', color: 'var(--color-gold)', fontFamily: 'var(--font-display)' }}>
          Câu Hỏi Thường Gặp
        </h1>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginBottom: '40px', fontSize: '1.05rem' }}>
          Chúng tôi giải đáp những thắc mắc phổ biến nhất để giúp bạn có trải nghiệm mua sắm tốt nhất.
        </p>

        {faqs && faqs.length > 0 ? (
          <FaqClient initialFaqs={faqs} />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Đang cập nhật câu hỏi thường gặp...
          </div>
        )}
      </main>
    </div>
  );
}
