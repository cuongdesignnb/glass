'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { publicApi } from '@/lib/api';

type Benefit = { title: string; text?: string };
type Testimonial = { name: string; text: string; rating?: number };
type Faq = { question: string; answer: string };
type Product = { id: number; name: string; price: number; sale_price: number; image: string };

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

function Stars({ n = 5 }: { n?: number }) {
  return <span className="lp-stars" aria-label={`${n} sao`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export default function LandingClient({ page, products, shop }: { page: PageData; products: Product[]; shop: Shop }) {
  const [cart, setCart] = useState<Record<number, number>>({});
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

  const lines = useMemo(
    () => products.filter((p) => cart[p.id] > 0).map((p) => ({ p, qty: cart[p.id] })),
    [products, cart],
  );
  const subtotal = lines.reduce((s, l) => s + unitPrice(l.p) * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= shop.shippingThreshold ? 0 : shop.shippingFee;
  const total = subtotal + shipping;
  const trackLines = useCallback(
    (ls: { p: Product; qty: number }[]): TrackLine[] =>
      ls.map((l) => ({ id: l.p.id, name: l.p.name, price: unitPrice(l.p), qty: l.qty })),
    [],
  );

  // ViewContent once on load.
  useEffect(() => {
    const t = setTimeout(() => {
      track('view', products.slice(0, 20).map((p) => ({ id: p.id, name: p.name, price: unitPrice(p), qty: 1 })),
        { value: products[0] ? unitPrice(products[0]) : 0 });
    }, 1200); // give the pixel scripts a moment to load
    return () => clearTimeout(t);
  }, [products]);

  // Lock page scroll and support Esc while the order dialog is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openCheckout = (ls: { p: Product; qty: number }[]) => {
    setOpen(true);
    if (!checkoutSent.current && ls.length > 0) {
      checkoutSent.current = true;
      track('checkout', trackLines(ls), { value: ls.reduce((s, l) => s + unitPrice(l.p) * l.qty, 0) });
    }
  };

  const buy = (p: Product) => {
    const next = { ...cart, [p.id]: cart[p.id] > 0 ? cart[p.id] : 1 };
    setCart(next);
    setOrder(null);
    setError('');
    openCheckout(products.filter((x) => next[x.id] > 0).map((x) => ({ p: x, qty: next[x.id] })));
  };

  const setQty = (id: number, qty: number) =>
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, 10);
      return next;
    });

  const scrollToProducts = () => {
    setOpen(false);
    setTimeout(() => document.getElementById('san-pham')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const mainCta = () => {
    if (lines.length > 0) {
      setOrder(null);
      openCheckout(lines);
    } else if (products.length === 1) {
      buy(products[0]);
    } else {
      document.getElementById('san-pham')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const phone = form.customer_phone.replace(/[\s.\-]/g, '');
    if (!form.customer_name.trim()) return setError('Vui lòng nhập họ tên.');
    if (!/^(0|\+84)\d{9,10}$/.test(phone)) return setError('Số điện thoại chưa đúng, vui lòng kiểm tra lại.');
    if (form.address.trim().length < 8) return setError('Vui lòng nhập địa chỉ nhận hàng đầy đủ.');
    if (lines.length === 0) return setError('Bạn chưa chọn sản phẩm nào.');

    setSubmitting(true);
    try {
      // Prices are rebuilt from the catalogue on the server; only ids and
      // quantities are sent.
      const result = await publicApi.createOrder({
        customer_name: form.customer_name.trim(),
        customer_phone: phone,
        address: form.address.trim(),
        note: form.note.trim() || null,
        payment_method: method,
        source: `landing:${page.slug}`,
        items: lines.map((l) => ({ product_id: l.p.id, quantity: l.qty })),
      });
      setOrder(result);
      if (method === 'cod' && !purchaseSent.current) {
        purchaseSent.current = true;
        track('purchase', trackLines(lines), { value: Number(result.total) || total, orderId: result.order_number });
      }
      setCart({});
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
      purchaseSent.current = false;
      checkoutSent.current = false;
    }
  };

  // ---- bank transfer details for the success view ----
  const bank = order?.bank_info || {};
  const qrUrl = bank.account_number && bank.bank_name
    ? `https://img.vietqr.io/image/${encodeURIComponent(bank.bank_name)}-${encodeURIComponent(bank.account_number)}-compact.png?amount=${Math.round(Number(order.total) || 0)}&addInfo=${encodeURIComponent(bank.transfer_content || order.payment_code || '')}&accountName=${encodeURIComponent(bank.account_name || '')}`
    : '';

  const best = products.length ? products.reduce((m, p) => (unitPrice(p) < unitPrice(m) ? p : m)) : null;

  return (
    <div className="lp">
      <Pixels fb={page.fb_pixel_id} tt={page.tiktok_pixel_id} ga={page.google_ads_id} />

      <header className="lp-top">
        <a className="lp-brand" href={shop.mainSite} rel="noopener">{shop.name}</a>
        {shop.phone && <a className="lp-top__call" href={`tel:${shop.phone}`}>Gọi {shop.phone}</a>}
      </header>

      {page.hero_image && (
        <div className="lp-gallery">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.hero_image} alt={page.headline} fetchPriority="high" />
        </div>
      )}

      <section className="lp-buy">
        {(page.promo_text || countdown) && (
          <div className="lp-flash">
            <div className="lp-flash__l">
              <b>⚡ Flash Sale</b>
              {page.promo_text && <span>{page.promo_text}</span>}
            </div>
            {countdown && (
              <div className="lp-flash__t" aria-label="Thời gian ưu đãi còn lại">
                <small>Kết thúc sau</small>
                <span className="lp-countdown">
                  {countdown.d > 0 && <b>{countdown.d}d</b>}
                  <b>{pad2(countdown.h)}</b><i>:</i><b>{pad2(countdown.m)}</b><i>:</i><b>{pad2(countdown.s)}</b>
                </span>
              </div>
            )}
          </div>
        )}
        <div className="lp-buy__body">
          {best && (
            <div className="lp-priceRow">
              <b>{vnd(unitPrice(best))}</b>
              {unitPrice(best) < best.price && (
                <>
                  <s>{vnd(best.price)}</s>
                  <em>-{Math.round((1 - unitPrice(best) / best.price) * 100)}%</em>
                </>
              )}
              {products.length > 1 && <span className="lp-priceRow__from">giá từ</span>}
            </div>
          )}
          <h1>{page.headline}</h1>
          {page.subheadline && <p className="lp-buy__sub">{page.subheadline}</p>}
        </div>
      </section>

      <section className="lp-card-block lp-perks">
        <div><span>🚚</span>Miễn phí vận chuyển đơn từ {vnd(shop.shippingThreshold)}</div>
        <div><span>💵</span>Thanh toán khi nhận hàng (COD) hoặc chuyển khoản QR</div>
        <div><span>🔍</span>Được kiểm tra hàng trước khi thanh toán</div>
      </section>

      {page.benefits.length > 0 && (
        <section className="lp-card-block">
          <h2 className="lp-h2">Cam kết của shop</h2>
          <ul className="lp-promises">
            {page.benefits.map((b, i) => (
              <li key={i}>
                <span aria-hidden="true">✓</span>
                <div><b>{b.title}</b>{b.text && <small>{b.text}</small>}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="lp-card-block" id="san-pham">
        <h2 className="lp-h2">Chọn mẫu bạn thích</h2>
        {products.length === 0 ? (
          <p className="lp-muted">Sản phẩm đang được cập nhật, vui lòng quay lại sau.</p>
        ) : (
          <div className="lp-grid">
            {products.map((p) => {
              const price = unitPrice(p);
              const off = price < p.price ? Math.round((1 - price / p.price) * 100) : 0;
              return (
                <article className="lp-card" key={p.id}>
                  <div className="lp-card__img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <div className="lp-noimg" />}
                  </div>
                  <h3 className="lp-card__name">{p.name}</h3>
                  <div className="lp-card__price">
                    <b>{vnd(price)}</b>
                    {off > 0 && <em>-{off}%</em>}
                  </div>
                  {off > 0 && <s className="lp-card__old">{vnd(p.price)}</s>}
                  <button className="lp-btn lp-btn--primary lp-btn--block lp-btn--sm" onClick={() => buy(p)}>Mua ngay</button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {page.testimonials.length > 0 && (
        <section className="lp-card-block">
          <h2 className="lp-h2">Đánh giá của khách hàng ({page.testimonials.length})</h2>
          <div className="lp-reviews">
            {page.testimonials.map((t, i) => (
              <figure className="lp-review" key={i}>
                <div className="lp-review__head">
                  <span className="lp-avatar" aria-hidden="true">{(t.name || '?').trim().charAt(0).toUpperCase()}</span>
                  <div><b>{t.name}</b><Stars n={t.rating || 5} /></div>
                </div>
                <blockquote>{t.text}</blockquote>
              </figure>
            ))}
          </div>
        </section>
      )}

      {page.faqs.length > 0 && (
        <section className="lp-card-block">
          <h2 className="lp-h2">Câu hỏi thường gặp</h2>
          <div className="lp-faq">
            {page.faqs.map((f, i) => (
              <details key={i}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <footer className="lp-footer">
        <div>© {new Date().getFullYear()} {shop.name}</div>
        <a href={shop.mainSite} rel="noopener">{shop.mainSite.replace(/^https?:\/\//, '')}</a>
      </footer>

      {/* Bottom buy bar */}
      <div className="lp-sticky">
        <a className="lp-sticky__ico" href={shop.mainSite} rel="noopener"><span>🏬</span>Cửa hàng</a>
        {shop.phone ? (
          <a className="lp-sticky__ico" href={`tel:${shop.phone}`}><span>📞</span>Gọi shop</a>
        ) : null}
        <button className="lp-btn lp-btn--primary lp-sticky__buy" onClick={mainCta}>
          {lines.length > 0 ? `${page.cta_text} · ${vnd(total)}` : page.cta_text}
        </button>
      </div>

      {/* Order dialog */}
      {open && (
        <div className="lp-overlay" onClick={closeAll}>
          <div className="lp-dialog" role="dialog" aria-modal="true" aria-label="Đặt hàng" onClick={(e) => e.stopPropagation()}>
            <button className="lp-close" onClick={closeAll} aria-label="Đóng">×</button>

            {order ? (
              <div className="lp-done">
                {paid ? (
                  <>
                    <div className="lp-done__icon lp-done__icon--ok">✓</div>
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
                    <div className="lp-done__icon lp-done__icon--ok">✓</div>
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

                {lines.length === 0 ? (
                  <div className="lp-empty">
                    <p>Bạn chưa chọn sản phẩm nào.</p>
                    <button type="button" className="lp-btn lp-btn--primary" onClick={scrollToProducts}>Chọn sản phẩm</button>
                  </div>
                ) : (
                  <ul className="lp-lines">
                    {lines.map(({ p, qty }) => (
                      <li key={p.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.image && <img src={p.image} alt="" />}
                        <div className="lp-lines__info">
                          <span>{p.name}</span>
                          <b>{vnd(unitPrice(p))}</b>
                        </div>
                        <div className="lp-qty">
                          <button type="button" onClick={() => setQty(p.id, qty - 1)} aria-label="Giảm">−</button>
                          <span>{qty}</span>
                          <button type="button" onClick={() => setQty(p.id, qty + 1)} aria-label="Tăng">+</button>
                        </div>
                      </li>
                    ))}
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

                <button className="lp-btn lp-btn--primary lp-btn--block lp-btn--lg" disabled={submitting || lines.length === 0}>
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
