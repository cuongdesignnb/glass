'use client';

import { useEffect, useState } from 'react';
import { publicApi } from '@/lib/api';

export default function FontLoader() {
  const [fontStyle, setFontStyle] = useState('');

  useEffect(() => {
    publicApi.getSettings('font')
      .then((settings: any) => {
        // settings may be object or array
        let s: Record<string, string> = {};
        if (Array.isArray(settings)) {
          settings.forEach((item: any) => { s[item.key] = item.value; });
        } else if (settings && typeof settings === 'object') {
          s = settings;
        }

        const enabled = s['custom_font_enabled'] === '1';
        const fontUrl = s['custom_font_url'];
        const fontName = s['custom_font_name'];
        const fontFormat = s['custom_font_format'] || 'truetype';

        if (!enabled || !fontUrl || !fontName) return;

        // Map extension to CSS format
        const formatMap: Record<string, string> = {
          ttf: 'truetype',
          otf: 'opentype',
          woff: 'woff',
          woff2: 'woff2',
        };
        const cssFormat = formatMap[fontFormat] || 'truetype';

        // Build the full URL
        const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
        const fullUrl = fontUrl.startsWith('http') ? fontUrl : `${apiBase}${fontUrl}`;

        const css = `
          @font-face {
            font-family: '${fontName}';
            src: url('${fullUrl}') format('${cssFormat}');
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }
          :root {
            --font-body: '${fontName}', -apple-system, BlinkMacSystemFont, sans-serif !important;
            --font-display: '${fontName}', Georgia, serif !important;
          }
        `;
        setFontStyle(css);
      })
      .catch(() => {});
  }, []);

  if (!fontStyle) return null;

  return <style dangerouslySetInnerHTML={{ __html: fontStyle }} />;
}
