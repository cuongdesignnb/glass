import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { getPublicSettings } from '@/lib/settings';
import { resolveMediaUrl } from '@/lib/media';
import LandingClient from './LandingClient';
import './landing.css';

// Prices must always be live, so never cache this page.
export const dynamic = 'force-dynamic';

const SHOP_ORIGIN = process.env.NEXT_PUBLIC_SHOP_URL || 'https://shop.mitoo.vn';

async function loadPage(slug: string) {
  try {
    return await publicApi.getLandingPage(slug);
  } catch {
    return null;
  }
}

function imageUrl(value?: string | null): string {
  if (!value) return '';
  return resolveMediaUrl(value);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await loadPage(params.slug);
  if (!page) return { title: 'Không tìm thấy', robots: { index: false, follow: false } };

  const title = page.headline || page.title;
  const image = imageUrl(page.hero_image) || imageUrl(page.products?.[0]?.thumbnail);
  const url = `${SHOP_ORIGIN}/${page.slug}`;

  return {
    title,
    description: page.subheadline || undefined,
    // The page is for paid/social traffic only. noindex keeps it from
    // competing with the same products on mitoo.vn.
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: url },
    openGraph: {
      title,
      description: page.subheadline || undefined,
      url,
      type: 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function LandingPage({ params }: { params: { slug: string } }) {
  const [page, settings] = await Promise.all([loadPage(params.slug), getPublicSettings()]);
  if (!page) notFound();

  const products = (page.products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    sale_price: Number(p.sale_price) || 0,
    image: imageUrl(p.thumbnail || p.images?.[0]),
  }));

  return (
    <LandingClient
      page={{
        slug: page.slug,
        title: page.title,
        headline: page.headline || page.title,
        subheadline: page.subheadline || '',
        hero_image: imageUrl(page.hero_image) || products[0]?.image || '',
        cta_text: page.cta_text || 'Đặt hàng ngay',
        promo_text: page.promo_text || '',
        promo_ends_at: page.promo_ends_at || null,
        benefits: page.benefits || [],
        testimonials: page.testimonials || [],
        faqs: page.faqs || [],
        fb_pixel_id: page.fb_pixel_id || '',
        tiktok_pixel_id: page.tiktok_pixel_id || '',
        google_ads_id: page.google_ads_id || '',
      }}
      products={products}
      shop={{
        name: settings['site_name'] || 'MITOO',
        phone: settings['contact_phone'] || '',
        shippingThreshold: Number(settings['payment_free_shipping_threshold']) || 500000,
        shippingFee: Number(settings['payment_shipping_fee']) || 30000,
        mainSite: process.env.NEXT_PUBLIC_APP_URL || 'https://mitoo.vn',
      }}
    />
  );
}
