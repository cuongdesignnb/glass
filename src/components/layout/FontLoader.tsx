'use client';

import { useEffect, useState } from 'react';
import { publicApi } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function FontLoader() {
  const [fontStyle, setFontStyle] = useState('');

  useEffect(() => {
    publicApi.getSettings('font')
      .then((settings: any) => {
        let s: Record<string, string> = {};
        if (Array.isArray(settings)) {
          settings.forEach((item: any) => { s[item.key] = item.value; });
        } else if (settings && typeof settings === 'object') {
          s = settings;
        }

        const enabled = s['custom_font_enabled'] === '1';
        const fontUrl = s['custom_font_url'];
        const fontName = s['custom_font_name'];
        const fontFormat = s['custom_font_format'] || 'ttf';

        if (!enabled || !fontUrl || !fontName) return;

        const formatMap: Record<string, string> = {
          ttf: 'truetype',
          otf: 'opentype',
          woff: 'woff',
          woff2: 'woff2',
        };
        const cssFormat = formatMap[fontFormat] || 'truetype';

        // Always serve via /api/public/font-file — this route is handled by
        // Laravel (nginx proxies /api to PHP). Direct /fonts/* paths are
        // swallowed by the Next.js proxy at `location /`.
        const fullUrl = `${API}/public/font-file?v=${encodeURIComponent(fontUrl)}`;

        // Escape font name for use inside CSS single-quoted string.
        const safeName = String(fontName).replace(/['\\]/g, '\\$&');

        const css = `
          @font-face {
            font-family: '${safeName}';
            src: url('${fullUrl}') format('${cssFormat}');
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }
          :root {
            --font-body: '${safeName}', -apple-system, BlinkMacSystemFont, sans-serif !important;
            --font-display: '${safeName}', Georgia, serif !important;
          }
          body, button, input, select, textarea {
            font-family: '${safeName}', -apple-system, BlinkMacSystemFont, sans-serif !important;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: '${safeName}', Georgia, serif !important;
          }
        `;
        setFontStyle(css);
      })
      .catch(() => {});
  }, []);

  if (!fontStyle) return null;

  return <style dangerouslySetInnerHTML={{ __html: fontStyle }} />;
}
