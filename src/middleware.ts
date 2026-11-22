import { NextRequest, NextResponse } from 'next/server';

/**
 * Host-based routing for the sales landing pages.
 *
 *   shop.mitoo.vn/<slug>  ->  internal route /lp/<slug>
 *
 * The same Next.js app serves mitoo.vn and shop.mitoo.vn. Landing pages are
 * only reachable through the shop host: /lp/* on any other host is a 404, so
 * mitoo.vn never exposes a duplicate copy of them.
 */
const SHOP_HOST_PREFIX = 'shop.';
const SLUG = /^\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/;

function notFound() {
  return new NextResponse('Not found', { status: 404 });
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .toLowerCase()
    .split(':')[0];
  const { pathname } = req.nextUrl;
  const isShop = host.startsWith(SHOP_HOST_PREFIX);

  if (!isShop) {
    return pathname === '/lp' || pathname.startsWith('/lp/') ? notFound() : NextResponse.next();
  }

  // shop.mitoo.vn/ has no page of its own: send people to the main site.
  if (pathname === '/') {
    const main = process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn';
    return NextResponse.redirect(new URL('/', main), 302);
  }

  if (SLUG.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/lp${pathname.replace(/\/$/, '')}`;
    return NextResponse.rewrite(url);
  }

  return notFound();
}

export const config = {
  // Skip Next internals, API routes and any file with an extension
  // (robots.txt, images, manifest...).
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
