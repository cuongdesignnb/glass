import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const requestUrl = new URL(request.url);
  const rawTitle = requestUrl.searchParams.get('title') || params.slug.replace(/[-_]+/g, ' ');
  const title = rawTitle.trim().slice(0, 150);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 82px',
          color: '#f8f4ea',
          background: 'linear-gradient(135deg, #111522 0%, #24202a 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, letterSpacing: 8, color: '#d7b56d', fontWeight: 700 }}>
          MITOO
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1040 }}>
          <div style={{ display: 'flex', fontSize: 62, lineHeight: 1.12, fontWeight: 700 }}>
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#d7d1c6' }}>
            Bài viết kính mắt và tư vấn từ MITOO
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: '#d7b56d' }}>
          mitoo.vn/bai-viet
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
