import { Metadata } from 'next';
import { getPublicSettings } from '@/lib/settings';
import { generateMeta, generateBreadcrumbSchema } from '@/lib/seo';
import AboutClient from './AboutClient';

export const revalidate = 60; // Revalidate dynamic content every 60 seconds

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const siteName = settings['site_name'] || 'Mitoo Eyewear';
  
  const title = settings['about_seo_title'] || `Về Chúng Tôi - ${siteName}`;
  const description = settings['about_seo_description'] || `Tìm hiểu câu chuyện thương hiệu của ${siteName}.`;
  const keywords = settings['about_seo_keywords'] || 'giới thiệu, câu chuyện thương hiệu';

  return await generateMeta({
    title,
    description,
    keywords,
    url: '/gioi-thieu',
  });
}

export default async function AboutPage() {
  const settings = await getPublicSettings();
  const siteName = settings['site_name'] || 'Mitoo Eyewear';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn';
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const apiMediaUrl = apiBaseUrl.replace('/api', '');
  const MEDIA_BASE = apiMediaUrl ? `${apiMediaUrl}/storage/` : '/storage/';

  const banner = settings['about_banner'];
  const title = settings['about_title'] || 'Về Chúng Tôi';
  const content = settings['about_content'] || '';
  const faqsRaw = settings['about_faqs'];

  let faqs = [];
  try {
    if (faqsRaw) {
      faqs = JSON.parse(faqsRaw);
    }
  } catch (e) {
    console.error('Failed to parse about page faqs:', e);
  }

  // Schema.org FAQPage
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

  // Schema.org AboutPage
  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: title,
    description: settings['about_seo_description'] || `Giới thiệu về ${siteName}`,
    url: `${appUrl}/gioi-thieu`,
    mainEntity: {
      '@type': 'Organization',
      name: siteName,
      url: appUrl,
      logo: settings['site_logo']
        ? (settings['site_logo'].startsWith('http') ? settings['site_logo'] : `${MEDIA_BASE}${settings['site_logo']}`)
        : undefined,
    }
  };

  const bannerUrl = banner 
    ? (banner.startsWith('http') ? banner : `${MEDIA_BASE}${banner}`)
    : null;

  return (
    <div style={{ paddingTop: 'var(--header-height)', background: 'var(--color-primary)', minHeight: '100vh', color: '#fff' }}>
      {/* Schema.org Injection */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBreadcrumbSchema([
            { name: 'Trang chủ', url: '/' },
            { name: 'Giới thiệu', url: '/gioi-thieu' },
          ])),
        }}
      />

      {/* Banner / Hero Section */}
      <div style={{
        position: 'relative',
        height: bannerUrl ? '320px' : '150px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: bannerUrl ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${bannerUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ textAlign: 'center', zIndex: 2, padding: '0 20px' }}>
          <h1 style={{
            fontSize: bannerUrl ? '2.75rem' : '2.25rem',
            fontWeight: 800,
            color: 'var(--color-gold)',
            fontFamily: 'var(--font-display)',
            textShadow: bannerUrl ? '0 4px 12px rgba(0,0,0,0.5)' : 'none',
            margin: 0,
          }}>
            {title}
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            marginTop: '8px',
            fontSize: '1rem',
            textShadow: bannerUrl ? '0 2px 6px rgba(0,0,0,0.5)' : 'none',
            maxWidth: '600px',
            margin: '8px auto 0 auto',
          }}>
            {settings['about_seo_description'] || `Câu chuyện và tầm nhìn phát triển của ${siteName}`}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ padding: '60px 20px', maxWidth: '840px', margin: '0 auto' }}>
        {/* Dynamic HTML Content */}
        {content ? (
          <div 
            className="about-content-html"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.4)',
          }}>
            Nội dung giới thiệu đang được cập nhật...
          </div>
        )}

        {/* FAQs Accordion */}
        {faqs.length > 0 && <AboutClient faqs={faqs} />}
      </main>
    </div>
  );
}
