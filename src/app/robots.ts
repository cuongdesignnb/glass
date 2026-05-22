import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/gio-hang',
          '/thanh-toan',
          '/tai-khoan',
          '/dang-nhap',
          '/dang-ky',
          '/tra-cuu-don-hang',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
