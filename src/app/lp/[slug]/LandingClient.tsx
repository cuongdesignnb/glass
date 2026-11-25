'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { publicApi } from '@/lib/api';

type Benefit = { title: string; text?: string };
type Testimonial = { name: string; text: string; rating?: number; variant?: string; images?: string[] };
type Faq = { question: string; answer: string };
type AddonOption = { id: number; name: string; price: number; available: boolean };
type AddonGroup = { id: number; name: string; required: boolean; options: AddonOption[] };
type Product = {
  id: number;
  name: string;
  price: number;
  sale_price: number;
  image: string;
  images: string[];
  colors: string[];
  colorNames: string[];
  colorImages: Record<string, string[]>;
  groups: AddonGroup[];
  constraints: { option_id: number; blocked_option_id: number }[];
};

type PageData = {
  slug: string;
  title: string;
  headline: string;
  subheadline: string;
  hero_image: string;
  cta_text: string;
  promo_text: string;
  promo_ends_at: string | null;
  benefits: Benefit[];
  testimonials: Testimonial[];
  faqs: Faq[];
  fb_pixel_id: string;
  tiktok_pixel_id: string;
  google_ads_id: string;
};

type Shop = {
  name: string;
  phone: string;
  shippingThreshold: number;
  shippingFee: number;
  mainSite: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';
const unitPrice = (p: Product) => (p.sale_price > 0 && p.sale_price < p.price ? p.sale_price : p.price);

// ---------------------------------------------------------------------------
// Ad pixels. IDs are validated server-side (digits / alphanumerics only) and
// are additionally JSON-encoded here before being written into inline scripts.
// ---------------------------------------------------------------------------
const REVIEWS_SHOWN = 3;

function Pixels({ fb, tt, ga }: { fb: string; tt: string; ga: string }) {
  return (
    <>
      {fb && (
        <Script id="lp-fb-pixel" strategy="afterInteractive" dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(fb)});fbq('track','PageView');`,
        }} />
      )}
      {tt && (
        <Script id="lp-tt-pixel" strategy="afterInteractive" dangerouslySetInnerHTML={{
          __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(${JSON.stringify(tt)});ttq.page();}(window,document,'ttq');`,
        }} />
      )}
      {ga && (
        <>
          <Script id="lp-ga-lib" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`} />
          <Script id="lp-ga-init" strategy="afterInteractive" dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(ga)});`,
          }} />
        </>
      )}
    </>
  );
}

type TrackLine = { id: number; name: string; price: number; qty: number };

function track(event: 'view' | 'checkout' | 'purchase', lines: TrackLine[], extra: { value: number; orderId?: string }) {
  if (typeof window === 'undefined' || lines.length === 0) return;
  const w = window as any;
  const base = { value: extra.value, currency: 'VND' };

  if (typeof w.fbq === 'function') {
    const name = { view: 'ViewContent', checkout: 'InitiateCheckout', purchase: 'Purchase' }[event];
    w.fbq('track', name, {
      ...base,
      content_type: 'product',
      content_ids: lines.map((l) => String(l.id)),
      num_items: lines.reduce((s, l) => s + l.qty, 0),
    });
  }
  if (w.ttq && typeof w.ttq.track === 'function') {
    const name = { view: 'ViewContent', checkout: 'InitiateCheckout', purchase: 'CompletePayment' }[event];
    w.ttq.track(name, {
      ...base,
      contents: lines.map((l) => ({ content_id: String(l.id), content_type: 'product', content_name: l.name, quantity: l.qty, price: l.price })),
    });
  }
  if (typeof w.gtag === 'function') {
    const name = { view: 'view_item', checkout: 'begin_checkout', purchase: 'purchase' }[event];
    w.gtag('event', name, {
      ...base,
      ...(extra.orderId ? { transaction_id: extra.orderId } : {}),
      items: lines.map((l) => ({ item_id: String(l.id), item_name: l.name, price: l.price, quantity: l.qty })),
    });
  }
}

// ---------------------------------------------------------------------------

function useCountdown(endIso: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!endIso) return;
    const end = Date.parse(endIso);
    if (Number.isNaN(end)) return;
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endIso]);
  if (left === null || left <= 0) return null;
  const s = Math.floor(left / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

// Inline SVG icons (no emoji, so rendering is identical on every device).
type IconProps = { className?: string };
const svgBase = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
};
const IcChevron = ({ dir = 'right' }: { dir?: 'left' | 'right' }) => (
  <svg {...svgBase} width={16} height={16}><path d={dir === 'right' ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} /></svg>
);
const IcTag = (_p: IconProps) => (
  <svg {...svgBase} width={30} height={30}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
);
const IcBolt = () => (
  <svg {...svgBase} width={18} height={18} fill="currentColor" strokeWidth={1}><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
);
const IcBookmark = () => (
  <svg {...svgBase} width={22} height={22} className="lp-info__save"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
);
const IcTruck = () => (
  <svg {...svgBase} width={17} height={17}><path d="M1 6h13v10H1zM14 10h4l3 3v3h-7z" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>
);
const IcShield = () => (
  <svg {...svgBase} width={16} height={16}><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
);
const IcEye = () => (
  <svg {...svgBase} width={16} height={16}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IcPhone = () => (
  <svg {...svgBase} width={20} height={20}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
);
const IcStore = () => (
  <svg {...svgBase} width={20} height={20}><path d="M3 9 4.5 4h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6" /></svg>
);
const IcCheck = () => (
  <svg {...svgBase} width={12} height={12} strokeWidth={3}><path d="m5 12 5 5 9-10" /></svg>
);
const IcClose = () => (
  <svg {...svgBase} width={18} height={18}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
const IcStar = ({ off }: { off?: boolean }) => (
  <svg {...svgBase} width={13} height={13} strokeWidth={1.5} fill={off ? 'none' : 'currentColor'} className={off ? 'lp-star lp-star--off' : 'lp-star'}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);

function Stars({ n = 5 }: { n?: number }) {
  return (
    <span className="lp-stars" aria-label={`${n} sao`}>
      {[1, 2, 3, 4, 5].map((i) => <IcStar key={i} off={i > n} />)}
    </span>
  );
}

const swatch = (c: string) => (c === 'transparent' || !c ? '#f5f5dc' : c);

export default function LandingClient({ page, products, shop }: { page: PageData; products: Product[]; shop: Shop }) {
  // ---- what the customer picked: one product (kiểu) + colour + add-ons + qty ----
  const [selId, setSelId] = useState<number>(products[0]?.id ?? 0);
  const [colorIdx, setColorIdx] = useState(0);
  const [addons, setAddons] = useState<Record<number, number | null>>({});
  const [qty, setQty] = useState(1);
  const [chosen, setChosen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [allReviews, setAllReviews] = useState(false);
  const [openReviews, setOpenReviews] = useState<Record<number, boolean>>({});
  const [rx, setRx] = useState('');

  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'cod' | 'bank_transfer'>('cod');
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', address: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState('');
  const countdown = useCountdown(page.promo_ends_at);
  const purchaseSent = useRef(false);
  const checkoutSent = useRef(false);

  const sel = products.find((p) => p.id === selId) || products[0] || null;
  const color = sel && sel.colors.length ? sel.colors[Math.min(colorIdx, sel.colors.length - 1)] : '';
  const colorName = sel && color ? sel.colorNames[sel.colors.indexOf(color)] || '' : '';

  const addonList = useMemo(() => {
    if (!sel) return [];
    return sel.groups.flatMap((g) => {
      const o = g.options.find((x) => x.id === addons[g.id]);
      return o ? [{ groupName: g.name, optionName: o.name, price: o.price }] : [];
    });
  }, [sel, addons]);
  const addonTotal = addonList.reduce((s, a) => s + a.price, 0);
  // Options such as "2 Mắt lệch độ (ghi chú)" need the customer's prescription.
  const needsRx = addonList.some((a) => /ghi\s*chú|lệch độ|bằng độ|loạn/i.test(a.optionName)
    || (/độ/i.test(a.groupName) && !/không/i.test(a.optionName)));

  const blocked = useMemo(() => {
    const set = new Set<number>();
    if (!sel) return set;
    Object.values(addons).forEach((oid) => {
      if (!oid) return;
      sel.constraints.forEach((c) => { if (c.option_id === oid) set.add(c.blocked_option_id); });
    });
    return set;
  }, [sel, addons]);

  const unit = sel ? unitPrice(sel) + addonTotal : 0;
  const subtotal = unit * qty;
  const shipping = subtotal === 0 || subtotal >= shop.shippingThreshold ? 0 : shop.shippingFee;
  const total = subtotal + shipping;
  const hasChoices = products.length > 1 || (sel?.colors.length ?? 0) > 0 || (sel?.groups.length ?? 0) > 0;
  const variantText = [colorName || (color && color !== 'transparent' ? color : ''), ...addonList.map((a) => a.optionName)]
    .filter(Boolean).join(', ');

  const trackLine = useCallback(
    (): TrackLine[] => (sel ? [{ id: sel.id, name: sel.name, price: unit, qty }] : []),
    [sel, unit, qty],
  );

  const chooseProduct = (id: number) => {
    setSelId(id);
    setColorIdx(0);
    setAddons({});
    setSheetError('');
  };

  const pickOption = (g: AddonGroup, o: AddonOption) => {
    if (!sel || !o.available || blocked.has(o.id)) return;
    const next: Record<number, number | null> = { ...addons, [g.id]: addons[g.id] === o.id && !g.required ? null : o.id };
    sel.constraints.forEach((c) => {
      if (c.option_id !== o.id) return;
      sel.groups.forEach((g2) => { if (next[g2.id] === c.blocked_option_id) next[g2.id] = null; });
    });
    setAddons(next);
    setSheetError('');
  };

  // ViewContent once on load.
  useEffect(() => {
    const t = setTimeout(() => {
      track('view', products.slice(0, 20).map((p) => ({ id: p.id, name: p.name, price: unitPrice(p), qty: 1 })),
        { value: products[0] ? unitPrice(products[0]) : 0 });
    }, 1200); // give the pixel scripts a moment to load
    return () => clearTimeout(t);
  }, [products]);

  // Lock page scroll and support Esc while a dialog is open.
  const dialogOpen = open || sheet;
  useEffect(() => {
    if (!dialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      setSheet(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [dialogOpen]);

  const startCheckout = () => {
    if (!sel) return;
    const missing = sel.groups.filter((g) => g.required && !addons[g.id]);
    if (missing.length) {
      setSheet(true);
      setSheetError(`Vui lòng chọn ${missing.map((g) => g.name).join(', ')}.`);
      return;
    }
    setChosen(true);
    setSheet(false);
    setOrder(null);
    setError('');
    setOpen(true);
    if (!checkoutSent.current) {
      checkoutSent.current = true;
      track('checkout', trackLine(), { value: subtotal });
    }
  };

  const openSheet = (id?: number) => {
    if (id !== undefined && id !== selId) chooseProduct(id);
    setSheetError('');
    setSheet(true);
  };

  const mainCta = () => {
    if (hasChoices && !chosen) openSheet();
    else startCheckout();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const phone = form.customer_phone.replace(/[\s.\-]/g, '');
    if (!sel) return setError('Bạn chưa chọn sản phẩm nào.');
    if (!form.customer_name.trim()) return setError('Vui lòng nhập họ tên.');
    if (!/^(0|\+84)\d{9,10}$/.test(phone)) return setError('Số điện thoại chưa đúng, vui lòng kiểm tra lại.');
    if (form.address.trim().length < 8) return setError('Vui lòng nhập địa chỉ nhận hàng đầy đủ.');
    if (needsRx && rx.trim().length < 2) return setError('Vui lòng nhập số độ mắt để shop cắt tròng đúng.');

    setSubmitting(true);
    try {
      // Prices are rebuilt on the server (landing price + add-on prices from
      // the catalogue); only ids, names of the chosen options and quantity are sent.
      const result = await publicApi.createOrder({
        customer_name: form.customer_name.trim(),
        customer_phone: phone,
        address: form.address.trim(),
        note: [needsRx && rx.trim() ? `Độ mắt: ${rx.trim()}` : '', form.note.trim()].filter(Boolean).join(' | ') || null,
        payment_method: method,
        source: `landing:${page.slug}`,
        items: [{
          product_id: sel.id,
          quantity: qty,
          image: sel.image || undefined,
          color: color || undefined,
          color_name: colorName || undefined,
          addons: addonList.map((a) => ({ groupName: a.groupName, optionName: a.optionName })),
        }],
      });
      setOrder(result);
      if (method === 'cod' && !purchaseSent.current) {
        purchaseSent.current = true;
        track('purchase', trackLine(), { value: Number(result.total) || total, orderId: result.order_number });
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra, vui lòng thử lại hoặc gọi hotline.');
    } finally {
      setSubmitting(false);
    }
  };

  // Bank transfer: poll until the SePay webhook marks the order as paid.
  const orderLinesRef = useRef<TrackLine[]>([]);
  useEffect(() => {
    if (order?.payment_method !== 'bank_transfer' || !order?.id || paid) return;
    orderLinesRef.current = (order.items || []).map((i: any) => ({
      id: i.product_id, name: i.name || '', price: Number(i.price) || 0, qty: Number(i.quantity) || 1,
    }));
    const started = Date.now();
    const t = setInterval(async () => {
      if (Date.now() - started > 30 * 60 * 1000) return clearInterval(t);
      try {
        const res = await fetch(`${API}/public/orders/${order.id}/payment-status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.payment_status === 'paid') {
          setPaid(true);
          clearInterval(t);
          if (!purchaseSent.current) {
            purchaseSent.current = true;
            track('purchase', orderLinesRef.current, { value: Number(order.total) || 0, orderId: order.order_number });
          }
        }
      } catch { /* keep polling */ }
    }, 5000);
    return () => clearInterval(t);
  }, [order, paid]);

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };

  const closeAll = () => {
    setOpen(false);
    if (order) {
      setOrder(null);
      setPaid(false);
      setChosen(false);
      setQty(1);
      purchaseSent.current = false;
      checkoutSent.current = false;
    }
  };

  // ---- bank transfer details for the success view ----
  const bank = order?.bank_info || {};
  const qrUrl = bank.account_number && bank.bank_name
    ? `https://img.vietqr.io/image/${encodeURIComponent(bank.bank_name)}-${encodeURIComponent(bank.account_number)}-compact.png?amount=${Math.round(Number(order.total) || 0)}&addInfo=${encodeURIComponent(bank.transfer_content || order.payment_code || '')}&accountName=${encodeURIComponent(bank.account_name || '')}`
    : '';

  const basePrice = sel ? unitPrice(sel) : 0;
  const off = sel && basePrice < sel.price ? Math.round((1 - basePrice / sel.price) * 100) : 0;
  const rated = page.testimonials.length
    ? page.testimonials.reduce((s, t) => s + (t.rating || 5), 0) / page.testimonials.length
    : 0;
  const hoursLeft = countdown ? countdown.d * 24 + countdown.h : 0;
  const shopHost = shop.mainSite.replace(/^https?:\/\//, '');

  // Gallery: page hero, then the photos of the colour / product being viewed.
  const gallery = useMemo(() => {
    const list: string[] = [page.hero_image];
    if (sel) {
      if (color) list.push(...(sel.colorImages[color] || []));
      list.push(...sel.images);
      if (sel.image) list.push(sel.image);
    }
    if (list.filter(Boolean).length === 0) list.push(...products.map((p) => p.image));
    return Array.from(new Set(list.filter(Boolean)));
  }, [page.hero_image, sel, color, products]);
  const [slide, setSlide] = useState(0);
  const galRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setSlide(0);
    galRef.current?.scrollTo({ left: 0 });
  }, [selId, color]);
  const goSlide = (i: number) => {
    const el = galRef.current;
    if (!el || gallery.length === 0) return;
    const n = (i + gallery.length) % gallery.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
    setSlide(n);
  };
  const onGalScroll = () => {
    const el = galRef.current;
    if (el && el.clientWidth) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };
  const toReviews = () => document.getElementById('danh-gia')?.scrollIntoView({ behavior: 'smooth' });

  const sheetImg = (color && sel?.colorImages[color]?.[0]) || sel?.image || '';

  return (
    <div className="lp">
      <Pixels fb={page.fb_pixel_id} tt={page.tiktok_pixel_id} ga={page.google_ads_id} />

      {gallery.length > 0 && (
        <section className="lp-gal" aria-label="Hình ảnh sản phẩm">
          <div className="lp-gal__view">
            <div className="lp-gal__track" ref={galRef} onScroll={onGalScroll}>
              {gallery.map((src, i) => (
                <div className="lp-gal__slide" key={src + i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${page.headline} ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} {...(i === 0 ? { fetchPriority: 'high' as const } : {})} />
                </div>
              ))}
            </div>
            {gallery.length > 1 && (
              <>
                <button type="button" className="lp-gal__nav lp-gal__nav--prev" onClick={() => goSlide(slide - 1)} aria-label="Ảnh trước"><IcChevron dir="left" /></button>
                <button type="button" className="lp-gal__nav lp-gal__nav--next" onClick={() => goSlide(slide + 1)} aria-label="Ảnh sau"><IcChevron dir="right" /></button>
                <span className="lp-gal__count">{slide + 1}/{gallery.length}</span>
              </>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="lp-gal__thumbs">
              {gallery.map((src, i) => (
                <button type="button" key={src + i} className={i === slide ? 'is-on' : ''} onClick={() => goSlide(i)} aria-label={`Xem ảnh ${i + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="lp-pricebar">
        <div className="lp-pricebar__l">
          <IcTag />
          <div>
            {sel && (
              <div className="lp-pricebar__row">
                <b>{vnd(basePrice)}</b>
              </div>
            )}
            {sel && off > 0 && (
              <div className="lp-pricebar__sub">
                <s>{vnd(sel.price)}</s>
                <em>-{off}%</em>
              </div>
            )}
          </div>
        </div>
        {(page.promo_text || countdown) && (
          <div className="lp-pricebar__r">
            <div className="lp-pricebar__t"><IcBolt /><span>{page.promo_text || 'Ưu đãi có hạn'}</span></div>
            {countdown && (
              <div className="lp-pricebar__c" aria-label="Thời gian ưu đãi còn lại">
                <small>Kết thúc sau</small>
                <span><b>{pad2(hoursLeft)}</b><i>Giờ</i></span>
                <span><b>{pad2(countdown.m)}</b><i>Phút</i></span>
                <span><b>{pad2(countdown.s)}</b><i>Giây</i></span>
              </div>
            )}
          </div>
        )}
      </div>

      <section className="lp-block lp-info">
        <div className="lp-info__title">
          <h1>{page.headline}</h1>
          <IcBookmark />
        </div>
        <div className="lp-info__meta">
          {rated > 0 ? (
            <button type="button" className="lp-rate lp-rate--link" onClick={toReviews}>
              <Stars n={Math.round(rated)} />
              <b>{rated.toFixed(1)}</b>/5<small>({page.testimonials.length} đánh giá)</small>
            </button>
          ) : <span />}
          <span className="lp-freeship"><IcTruck /> Miễn phí vận chuyển</span>
        </div>
      </section>

      <section className="lp-block lp-chips" aria-label="Ưu điểm mua hàng">
        <span><IcShield /> Thanh toán an toàn</span>
        <span><IcEye /> Được kiểm tra hàng</span>
        {shop.phone && <span><IcPhone /> Hỗ trợ {shop.phone}</span>}
      </section>

      <section className="lp-block lp-rows">
        <button type="button" className="lp-row" onClick={() => openSheet()}>
          <span>Phân loại</span>
          <span className="lp-row__r lp-row__sel">
            {sel && (variantText || (products.length > 1 ? sel.name : '')) || 'Chọn phân loại'}
            <IcChevron dir="right" />
          </span>
        </button>
        <div className="lp-row lp-row--static">
          <span>Vận chuyển</span>
          <span className="lp-row__r"><s>{vnd(shop.shippingFee)}</s></span>
        </div>
        <p className="lp-voucher">
          <span className="lp-tag">Freeship</span> Miễn phí vận chuyển cho đơn từ {vnd(shop.shippingThreshold)}. Thanh toán khi nhận hàng (COD) hoặc chuyển khoản QR.
        </p>
      </section>

      {products.length > 1 && (
        <section className="lp-block" id="san-pham">
          <h2 className="lp-h2">Chọn kiểu bạn thích</h2>
          <div className="lp-grid">
            {products.map((p) => {
              const price = unitPrice(p);
              const poff = price < p.price ? Math.round((1 - price / p.price) * 100) : 0;
              return (
                <article className={`lp-card${p.id === selId ? ' is-on' : ''}`} key={p.id}>
                  <div className="lp-card__img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <div className="lp-noimg" />}
                  </div>
                  <h3 className="lp-card__name">{p.name}</h3>
                  <div className="lp-card__price">
                    <b>{vnd(price)}</b>
                    {poff > 0 && <em>-{poff}%</em>}
                  </div>
                  {poff > 0 && <s className="lp-card__old">{vnd(p.price)}</s>}
                  <button className="lp-btn lp-btn--primary lp-btn--block lp-btn--sm" onClick={() => openSheet(p.id)}>Mua ngay</button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {page.testimonials.length > 0 && (
        <section className="lp-block" id="danh-gia">
          <div className="lp-h2 lp-h2--row">
            <h2>Đánh giá của khách hàng ({page.testimonials.length})</h2>
          </div>
          <div className="lp-rate lp-rate--big"><b>{rated.toFixed(1)}</b>/5 <Stars n={Math.round(rated)} /></div>
          <div className="lp-reviews">
            {(allReviews ? page.testimonials : page.testimonials.slice(0, REVIEWS_SHOWN)).map((t, i) => (
              <figure className="lp-review" key={i}>
                <span className="lp-avatar" aria-hidden="true">{(t.name || '?').trim().charAt(0).toUpperCase()}</span>
                <div className="lp-review__body">
                  <div className="lp-review__head"><b>{t.name}</b><Stars n={t.rating || 5} /></div>
                  {t.variant && <small className="lp-review__var">Đã mua: {t.variant}</small>}
                  <blockquote
                    className={openReviews[i] || (t.text || '').length <= 140 ? '' : 'is-clamped'}
                    onClick={() => setOpenReviews((o) => ({ ...o, [i]: true }))}
                  >
                    {t.text}
                  </blockquote>
                  {!openReviews[i] && (t.text || '').length > 140 && (
                    <button type="button" className="lp-link lp-review__more" onClick={() => setOpenReviews((o) => ({ ...o, [i]: true }))}>Xem thêm</button>
                  )}
                  {t.images && t.images.length > 0 && (
                    <div className="lp-review__imgs">
                      {t.images.map((src, k) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={k} src={src} alt={`Ảnh đánh giá của ${t.name}`} loading="lazy" />
                      ))}
                    </div>
                  )}
                </div>
              </figure>
            ))}
          </div>
          {page.testimonials.length > REVIEWS_SHOWN && (
            <button
              type="button"
              className="lp-btn lp-btn--ghost lp-btn--block lp-reviews__toggle"
              onClick={() => {
                if (allReviews) document.getElementById('danh-gia')?.scrollIntoView({ block: 'start' });
                setAllReviews((v) => !v);
              }}
            >
              {allReviews ? 'Thu gọn đánh giá' : `Xem tất cả ${page.testimonials.length} đánh giá`}
            </button>
          )}
        </section>
      )}

      <section className="lp-block lp-shopcard">
        <span className="lp-shopcard__logo" aria-hidden="true">{shop.name.trim().charAt(0).toUpperCase()}</span>
        <div>
          <b>{shop.name}</b>
          <small>{shopHost}</small>
        </div>
        <a className="lp-btn lp-btn--ghost lp-btn--sm" href={shop.mainSite} rel="noopener">Truy cập</a>
      </section>

      <section className="lp-block lp-desc">
        <h2 className="lp-h2">Mô tả sản phẩm</h2>
        {page.subheadline && <p>{page.subheadline}</p>}
        {page.benefits.length > 0 && (
          <ul className="lp-promises">
            {page.benefits.map((b, i) => (
              <li key={i}>
                <span aria-hidden="true"><IcCheck /></span>
                <div><b>{b.title}</b>{b.text && <small>{b.text}</small>}</div>
              </li>
            ))}
          </ul>
        )}
        {page.faqs.length > 0 && (
          <div className="lp-faq">
            <h3 className="lp-h3">Câu hỏi thường gặp</h3>
            {page.faqs.map((f, i) => (
              <details key={i}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        )}
      </section>

      <footer className="lp-footer">
        <div>© {new Date().getFullYear()} {shop.name}</div>
        <a href={shop.mainSite} rel="noopener">{shopHost}</a>
      </footer>

      {/* Bottom buy bar */}
      <div className="lp-sticky">
        <a className="lp-sticky__ico" href={shop.mainSite} rel="noopener"><IcStore />Cửa hàng</a>
        {shop.phone ? (
          <a className="lp-sticky__ico" href={`tel:${shop.phone}`}><IcPhone />Gọi shop</a>
        ) : null}
        {hasChoices && (
          <button type="button" className="lp-btn lp-btn--outline lp-sticky__alt" onClick={() => openSheet()}>Phân loại</button>
        )}
        <button className="lp-btn lp-btn--primary lp-sticky__buy" onClick={mainCta}>
          {chosen && sel ? `${page.cta_text} · ${vnd(total)}` : page.cta_text}
        </button>
      </div>

      {/* Variant sheet: kiểu / màu / độ cận... */}
      {sheet && sel && (
        <div className="lp-overlay" onClick={() => setSheet(false)}>
          <div className="lp-dialog lp-vs" role="dialog" aria-modal="true" aria-label="Chọn phân loại" onClick={(e) => e.stopPropagation()}>
            <button className="lp-close" onClick={() => setSheet(false)} aria-label="Đóng"><IcClose /></button>

            <div className="lp-vs__head">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {sheetImg ? <img src={sheetImg} alt="" /> : <span className="lp-vs__noimg" />}
              <div>
                <div className="lp-vs__price">
                  <b>{vnd(unit)}</b>
                  {off > 0 && <s>{vnd(sel.price + addonTotal)}</s>}
                </div>
                <small>{variantText || 'Chưa chọn phân loại'}</small>
              </div>
            </div>

            <div className="lp-vs__body">
              {products.length > 1 && (
                <div className="lp-vs__group">
                  <div className="lp-vs__label">Kiểu</div>
                  <div className="lp-vs__chips">
                    {products.map((p) => (
                      <button type="button" key={p.id} className={`lp-chip lp-chip--prod${p.id === selId ? ' is-on' : ''}`} onClick={() => chooseProduct(p.id)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.image && <img src={p.image} alt="" />}
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sel.colors.length > 0 && (
                <div className="lp-vs__group">
                  <div className="lp-vs__label">Màu sắc{colorName ? `: ${colorName}` : ''}</div>
                  <div className="lp-vs__chips">
                    {sel.colors.map((c, i) => (
                      <button type="button" key={c + i} className={`lp-chip${c === color ? ' is-on' : ''}`} onClick={() => setColorIdx(i)}>
                        <i className="lp-dot" style={{ background: swatch(c) }} />
                        {sel.colorNames[i] || c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sel.groups.map((g) => (
                <div className="lp-vs__group" key={g.id}>
                  <div className="lp-vs__label">{g.name}{g.required && <em> *</em>}</div>
                  <div className="lp-vs__chips">
                    {g.options.map((o) => {
                      const dis = !o.available || blocked.has(o.id);
                      return (
                        <button type="button" key={o.id} disabled={dis}
                          className={`lp-chip${addons[g.id] === o.id ? ' is-on' : ''}`} onClick={() => pickOption(g, o)}>
                          {o.name}
                          {o.price > 0 && <small>+{vnd(o.price)}</small>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="lp-vs__group lp-vs__qty">
                <div className="lp-vs__label">Số lượng</div>
                <div className="lp-qty">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm">−</button>
                  <span>{qty}</span>
                  <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Tăng">+</button>
                </div>
              </div>

              {sheetError && <p className="lp-error" role="alert">{sheetError}</p>}
            </div>

            <button className="lp-btn lp-btn--primary lp-btn--block lp-btn--lg" onClick={startCheckout}>
              {page.cta_text} · {vnd(subtotal)}
            </button>
          </div>
        </div>
      )}

      {/* Order dialog */}
      {open && (
        <div className="lp-overlay" onClick={closeAll}>
          <div className="lp-dialog" role="dialog" aria-modal="true" aria-label="Đặt hàng" onClick={(e) => e.stopPropagation()}>
            <button className="lp-close" onClick={closeAll} aria-label="Đóng"><IcClose /></button>

            {order ? (
              <div className="lp-done">
                {paid ? (
                  <>
                    <div className="lp-done__icon lp-done__icon--ok"><IcCheck /></div>
                    <h3>Thanh toán thành công!</h3>
                    <p>Chúng tôi đã nhận được tiền và đang chuẩn bị đơn hàng của bạn.</p>
                  </>
                ) : order.payment_method === 'bank_transfer' ? (
                  <>
                    <h3>Đặt hàng thành công, vui lòng chuyển khoản</h3>
                    {qrUrl && (
                      <div className="lp-qr">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="Mã QR chuyển khoản" />
                        <small>Quét mã bằng app ngân hàng</small>
                      </div>
                    )}
                    <dl className="lp-bank">
                      {[
                        ['Ngân hàng', bank.bank_name],
                        ['Số tài khoản', bank.account_number],
                        ['Chủ tài khoản', bank.account_name],
                        ['Nội dung CK', bank.transfer_content || order.payment_code],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k as string}>
                          <dt>{k}</dt>
                          <dd>
                            <b>{v}</b>
                            <button type="button" onClick={() => copy(String(v), k as string)}>{copied === k ? 'Đã chép' : 'Chép'}</button>
                          </dd>
                        </div>
                      ))}
                      <div><dt>Số tiền</dt><dd><b className="lp-accent">{vnd(Number(order.total) || 0)}</b></dd></div>
                    </dl>
                    <p className="lp-muted">Giữ nguyên nội dung chuyển khoản để hệ thống tự xác nhận. Trang này sẽ tự cập nhật khi nhận được tiền.</p>
                  </>
                ) : (
                  <>
                    <div className="lp-done__icon lp-done__icon--ok"><IcCheck /></div>
                    <h3>Đặt hàng thành công!</h3>
                    <p>Nhân viên sẽ gọi xác nhận đơn trong thời gian sớm nhất. Bạn thanh toán khi nhận hàng.</p>
                  </>
                )}
                <p className="lp-order-no">Mã đơn: <b>{order.order_number}</b></p>
                <button className="lp-btn lp-btn--primary lp-btn--block" onClick={closeAll}>Đóng</button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h3 className="lp-dialog__title">Thông tin đặt hàng</h3>

                {sel && (
                  <ul className="lp-lines">
                    <li>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {sheetImg && <img src={sheetImg} alt="" />}
                      <div className="lp-lines__info">
                        <span>{sel.name}</span>
                        {variantText && <small>{variantText}</small>}
                        <b>{vnd(unit)}</b>
                        {hasChoices && <button type="button" className="lp-link" onClick={() => { setOpen(false); openSheet(); }}>Đổi phân loại</button>}
                      </div>
                      <div className="lp-qty">
                        <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm">−</button>
                        <span>{qty}</span>
                        <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Tăng">+</button>
                      </div>
                    </li>
                  </ul>
                )}

                <label className="lp-field">
                  <span>Họ và tên *</span>
                  <input autoComplete="name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                </label>
                <label className="lp-field">
                  <span>Số điện thoại *</span>
                  <input type="tel" inputMode="tel" autoComplete="tel" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                </label>
                <label className="lp-field">
                  <span>Địa chỉ nhận hàng *</span>
                  <textarea rows={2} autoComplete="street-address" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </label>
                {needsRx && (
                  <label className="lp-field">
                    <span>Số độ mắt *</span>
                    <textarea rows={2} value={rx} onChange={(e) => setRx(e.target.value)}
                      placeholder="VD: Mắt trái cận 2.0 độ, mắt phải cận 2.25 độ, loạn 0.5 độ. Chưa rõ thì ghi “shop gọi tư vấn”." />
                  </label>
                )}
                <label className="lp-field">
                  <span>Ghi chú</span>
                  <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Không bắt buộc" />
                </label>

                <fieldset className="lp-pay">
                  <legend>Hình thức thanh toán</legend>
                  <label className={method === 'cod' ? 'is-on' : ''}>
                    <input type="radio" name="pm" checked={method === 'cod'} onChange={() => setMethod('cod')} />
                    <span><b>Thanh toán khi nhận hàng (COD)</b><small>Nhận hàng, kiểm tra rồi mới trả tiền</small></span>
                  </label>
                  <label className={method === 'bank_transfer' ? 'is-on' : ''}>
                    <input type="radio" name="pm" checked={method === 'bank_transfer'} onChange={() => setMethod('bank_transfer')} />
                    <span><b>Chuyển khoản ngân hàng (QR)</b><small>Quét mã, hệ thống tự xác nhận</small></span>
                  </label>
                </fieldset>

                <div className="lp-sum">
                  <div><span>Tạm tính</span><span>{vnd(subtotal)}</span></div>
                  <div><span>Phí vận chuyển</span><span>{shipping === 0 ? 'Miễn phí' : vnd(shipping)}</span></div>
                  <div className="lp-sum__total"><span>Tổng cộng</span><b>{vnd(total)}</b></div>
                  {shipping > 0 && (
                    <small>Mua thêm {vnd(shop.shippingThreshold - subtotal)} để được miễn phí vận chuyển.</small>
                  )}
                </div>

                {error && <p className="lp-error" role="alert">{error}</p>}

                <button className="lp-btn lp-btn--primary lp-btn--block lp-btn--lg" disabled={submitting || !sel}>
                  {submitting ? 'Đang gửi đơn...' : `Xác nhận đặt hàng · ${vnd(total)}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
