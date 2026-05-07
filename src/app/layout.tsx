import type { Metadata, Viewport } from 'next';
import './globals.css';
import FontLoader from '@/components/layout/FontLoader';

const INTERNAL_API = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_HOST = process.env.API_HOST || '';
const MEDIA_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace('/api', '');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function fetchPublicSettings(): Promise<Record<string, string>> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (API_HOST) headers['Host'] = API_HOST;
    const res = await fetch(`${INTERNAL_API}/public/settings`, {
      next: { revalidate: 300 },
      headers,
    });
    if (!res.ok) return {};
    const data = await res.json();
    const flat: Record<string, string> = {};
    Object.values(data).forEach((group: any) => {
      if (typeof group === 'object' && group !== null) {
        Object.entries(group).forEach(([key, value]) => {
          flat[key] = value as string;
        });
      }
    });
    return flat;
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await fetchPublicSettings();

  const siteName = s['site_name'] || 'Glass Eyewear';
  const title = s['seo_title'] || `${siteName} - Kính Mắt Thời Trang Cao Cấp`;
  const description = s['seo_description'] || s['site_description'] || 'Cửa hàng kính mắt thời trang cao cấp - Đa dạng kiểu dáng, chất liệu. Thử kính ảo AI. Miễn phí vận chuyển toàn quốc.';
  const keywords = s['seo_keywords'] || 'kính mắt, kính thời trang, kính cận, kính râm, mắt kính, glass eyewear';

  const faviconUrl = s['site_favicon']
    ? (s['site_favicon'].startsWith('http') ? s['site_favicon'] : `${MEDIA_BASE}${s['site_favicon']}`)
    : '/favicon.ico';

  const ogImage = s['site_logo']
    ? (s['site_logo'].startsWith('http') ? s['site_logo'] : `${MEDIA_BASE}${s['site_logo']}`)
    : `${APP_URL}/og-default.jpg`;

  return {
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    keywords,
    manifest: '/manifest.json',
    icons: {
      icon: faviconUrl,
      apple: '/icons/icon-192x192.png',
    },
    openGraph: {
      title,
      description,
      url: APP_URL,
      siteName,
      locale: 'vi_VN',
      type: 'website',
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#faf9f7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Global Schema: WebSite with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Glass Eyewear',
              url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/san-pham?search={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        {/* Global Schema: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Glass Eyewear',
              url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
              logo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/logo.png`,
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer service',
                areaServed: 'VN',
                availableLanguage: 'Vietnamese',
              },
              sameAs: [],
            }),
          }}
        />
        <FontLoader />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
