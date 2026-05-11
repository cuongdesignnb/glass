import type { Metadata, Viewport } from 'next';
import './globals.css';

const INTERNAL_API = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_HOST = process.env.API_HOST || '';
const MEDIA_BASE = PUBLIC_API.replace('/api', '');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const FONT_FORMAT_MAP: Record<string, string> = {
  ttf: 'truetype',
  otf: 'opentype',
  woff: 'woff',
  woff2: 'woff2',
};

const FONT_FALLBACK_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type CustomFontInfo = {
  name: string;
  url: string;
  format: string;
  cssFormat: string;
  mime: string;
};

function resolveCustomFont(s: Record<string, string>): CustomFontInfo | null {
  if (s['custom_font_enabled'] !== '1') return null;
  const url = s['custom_font_url'];
  const name = s['custom_font_name'];
  if (!url || !name) return null;
  const format = (s['custom_font_format'] || 'ttf').toLowerCase();
  return {
    name: String(name).replace(/['\\]/g, '\\$&'),
    url: `${PUBLIC_API}/public/font-file?v=${encodeURIComponent(url)}`,
    format,
    cssFormat: FONT_FORMAT_MAP[format] || 'truetype',
    mime: `font/${format}`,
  };
}

function buildFontStyle(font: CustomFontInfo): string {
  const stack = `'${font.name}', ${FONT_FALLBACK_STACK}`;
  return `
@font-face {
  font-family: '${font.name}';
  src: url('${font.url}') format('${font.cssFormat}');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
:root {
  --font-body: ${stack};
  --font-display: ${stack};
}
html, body, button, input, select, textarea, optgroup {
  font-family: var(--font-body);
}
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
}
`.trim();
}

async function fetchPublicSettings(): Promise<Record<string, string>> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (API_HOST) headers['Host'] = API_HOST;
    const res = await fetch(`${INTERNAL_API}/public/settings`, {
      next: { revalidate: 60 },
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await fetchPublicSettings();
  const siteName = settings['site_name'] || 'Glass Eyewear';
  const customFont = resolveCustomFont(settings);
  const fontStyle = customFont ? buildFontStyle(customFont) : null;

  return (
    <html lang="vi">
      <head>
        {customFont ? (
          <>
            <link
              rel="preload"
              href={customFont.url}
              as="font"
              type={customFont.mime}
              crossOrigin="anonymous"
            />
            <style dangerouslySetInnerHTML={{ __html: fontStyle as string }} />
          </>
        ) : (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
              href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
              rel="stylesheet"
            />
          </>
        )}
      </head>
      <body>
        {/* Global Schema: WebSite with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteName,
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
              name: siteName,
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
