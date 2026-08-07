import { NextResponse } from 'next/server';
import { resolveMediaUrl } from '@/lib/media';
import { getFreshPublicSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400';

function inferContentType(url: string): string {
  const extension = url.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'svg') return 'image/svg+xml';
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/x-icon';
}

async function imageResponse(response: Response, sourceUrl: string): Promise<NextResponse | null> {
  if (!response.ok) return null;

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim();
  const body = await response.arrayBuffer();
  if (!body.byteLength) return null;
  const inferredType = inferContentType(sourceUrl);
  if (!contentType?.startsWith('image/')) {
    // A favicon URL must not proxy an HTML error page as an image. ICO files
    // are commonly served as application/octet-stream, so verify their magic.
    if (inferredType !== 'image/x-icon' || body.byteLength < 4) return null;
    const bytes = new Uint8Array(body.slice(0, 4));
    if (!(bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0)) return null;
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType?.startsWith('image/') ? contentType : inferredType,
      'Cache-Control': CACHE_CONTROL,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET() {
  let configured = false;
  try {
    const settings = await getFreshPublicSettings();
    const faviconPath = settings['site_favicon']?.trim();

    if (faviconPath) {
      configured = true;
      const sourceUrl = resolveMediaUrl(faviconPath);
      const upstream = await fetch(sourceUrl, { cache: 'no-store', redirect: 'follow' });
      const response = await imageResponse(upstream, sourceUrl);
      if (response) return response;
      console.warn(`Favicon source returned ${upstream.status}: ${sourceUrl}`);
    }
  } catch (error) {
    console.error('Error fetching configured favicon:', error);
  }

  return new NextResponse(null, {
    status: configured ? 502 : 404,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
