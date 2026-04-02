import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/lib/useCart';

import { publicApi } from '@/lib/api';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let headerMenus = [];
  let footerMenus = [];
  let fontSettings: any = {};
  try {
    const [h, f, settings] = await Promise.all([
      publicApi.getMenus('header').catch(() => []),
      publicApi.getMenus('footer').catch(() => []),
      publicApi.getSettings('font').catch(() => ({})),
    ]);
    headerMenus = h;
    footerMenus = f;
    fontSettings = settings?.font || settings || {};
  } catch (e) {}

  const fontEnabled = fontSettings.custom_font_enabled === '1';
  const fontUrl = fontSettings.custom_font_url || '';
  const fontName = fontSettings.custom_font_name || '';
  const fontFormat = fontSettings.custom_font_format || 'ttf';

  const formatMap: Record<string, string> = {
    ttf: 'truetype',
    otf: 'opentype',
    woff: 'woff',
    woff2: 'woff2',
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
  const fullFontUrl = fontUrl.startsWith('http') ? fontUrl : `${API_BASE}${fontUrl}`;

  return (
    <CartProvider>
      {fontEnabled && fontUrl && (
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: '${fontName}';
            src: url('${fullFontUrl}') format('${formatMap[fontFormat] || 'truetype'}');
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }
          body, h1, h2, h3, h4, h5, h6, p, a, span, div, input, textarea, button, select {
            font-family: '${fontName}', system-ui, -apple-system, sans-serif !important;
          }
        `}} />
      )}
      <Header menus={headerMenus.length > 0 ? headerMenus : undefined} />
      <main>{children}</main>
      <Footer menus={footerMenus.length > 0 ? footerMenus : undefined} />
    </CartProvider>
  );
}
