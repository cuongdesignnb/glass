'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { useSettings } from '@/lib/useSettings';
import { RiGlassesLine, RiSunLine, RiVipCrownLine, RiPriceTag3Line } from 'react-icons/ri';
import { FiArrowRight, FiCopy, FiCheck, FiGift, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

function getImageUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

// ── Hero Section (reads from admin settings) ──
export function DynamicHero() {
  const { settings } = useSettings();

  const heroTitle = settings['hero_title'] || 'Phong Cách Đẳng Cấp\nQua Mỗi Ánh Nhìn';
  const heroDesc = settings['hero_subtitle'] || 'Khám phá bộ sưu tập kính mắt cao cấp với công nghệ AI thử kính ảo. Tìm kiếm chiếc kính hoàn hảo cho phong cách riêng của bạn.';
  const heroCtaText = settings['hero_cta_text'] || 'Khám Phá Ngay';
  const heroTag = settings['hero_tag'] || 'Bộ Sưu Tập Mới 2026';
  const heroImage = settings['hero_image'] ? getImageUrl(settings['hero_image']) : null;
  const heroTextColor = settings['hero_text_color'] || '';
  const heroDescColor = settings['hero_desc_color'] || '';
  const heroOverlay = settings['hero_overlay'] || 'left-dark';

  // Split title into parts for styling (first line em, second normal)
  const titleParts = heroTitle.split('\n');

  // Overlay gradient based on setting
  const overlayGradients: Record<string, string> = {
    'left-dark': 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.05) 70%, transparent 100%)',
    'left-light': 'linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.05) 70%, transparent 100%)',
    'full-dark': 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%)',
    'full-light': 'linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 100%)',
    'none': 'none',
  };

  const hasImage = !!heroImage;
  const overlayBg = hasImage ? (overlayGradients[heroOverlay] || overlayGradients['left-dark']) : 'none';
  const isDarkOverlay = heroOverlay.includes('dark');

  // Auto text colors: if custom color set, use it. Otherwise derive from overlay type
  const titleColor = heroTextColor || (hasImage ? (isDarkOverlay ? '#ffffff' : 'var(--color-text-heading)') : 'var(--color-text-heading)');
  const descColor = heroDescColor || (hasImage ? (isDarkOverlay ? 'rgba(255,255,255,0.85)' : 'var(--color-text-light)') : 'var(--color-text-light)');
  const textShadow = hasImage ? (isDarkOverlay ? '0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)' : '0 1px 6px rgba(255,255,255,0.6)') : 'none';

  const heroMobileImage = settings['hero_image_mobile'] ? getImageUrl(settings['hero_image_mobile']) : null;

  return (
    <section className="hero">
      <div className="hero__bg">
        {hasImage && (
          <>
            {/* Desktop image */}
            <img
              src={heroImage!}
              alt="Hero"
              className="hero__bg-img hero__bg-img--desktop"
            />
            {/* Mobile image: use separate mobile image if set, else fallback to desktop */}
            <img
              src={heroMobileImage || heroImage!}
              alt="Hero"
              className="hero__bg-img hero__bg-img--mobile"
            />
            <div className="hero__overlay" style={{ position: 'absolute', inset: 0, background: overlayBg, zIndex: 1 }} />
          </>
        )}
        <div className="hero__bg-gradient" />
        {!hasImage && (
          <div className="hero__particles">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="hero__particle" style={{
                left: `${(i * 7.3) % 100}%`, top: `${(i * 13.7) % 100}%`,
                animationDelay: `${i * 0.5}s`, animationDuration: `${6 + (i % 4)}s`,
              }} />
            ))}
          </div>
        )}
      </div>
      <div className="container" style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 'var(--space-3xl)', minHeight: '100vh' }}>
        <div className="hero__content">
          <div className="hero__tag" style={hasImage && isDarkOverlay ? { background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)', color: '#fff' } : undefined}>✦ {heroTag}</div>
          <h1 className="hero__title" style={{ color: titleColor, textShadow }}>
            {titleParts.length > 1 ? (
              <>{titleParts[0]}<br />{titleParts.slice(1).join(' ')}</>
            ) : heroTitle}
          </h1>
          <p className="hero__desc" style={{ color: descColor, textShadow }}>{heroDesc}</p>
          <div className="hero__actions">
            <Link href="/san-pham" className="btn btn-primary btn-lg">{heroCtaText} <FiArrowRight /></Link>
            <Link href="/thu-kinh-ao" className="btn btn-secondary btn-lg" style={hasImage && isDarkOverlay ? { borderColor: 'rgba(255,255,255,0.4)', color: '#fff' } : undefined}>Thử Kính AI</Link>
          </div>
        </div>
        <div className="hero__visual">
          <div className="hero__visual-ring hero__visual-ring--lg" />
          <div className="hero__visual-ring hero__visual-ring--md" />
          <div className="hero__visual-ring hero__visual-ring--sm" />
          <div className="hero__visual-badge hero__visual-badge--1"><span className="hero__visual-badge-num">500+</span><span className="hero__visual-badge-txt">Mẫu Kính</span></div>
          <div className="hero__visual-badge hero__visual-badge--2"><span className="hero__visual-badge-num">4.9★</span><span className="hero__visual-badge-txt">Đánh Giá</span></div>
          <div className="hero__visual-center">
            <div className="hero__glasses-shape">
              <div className="hero__glasses-lens hero__glasses-lens--left" />
              <div className="hero__glasses-bridge" />
              <div className="hero__glasses-lens hero__glasses-lens--right" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Stats Section (reads from admin settings) ──
export function DynamicStats() {
  const { settings } = useSettings();
  return (
    <section className="section stats-section">
      <div className="container">
        <div className="stats-grid">
          <div className="stat"><div className="stat__number">{settings['stat_customers'] || '10,000+'}</div><div className="stat__label">Khách Hàng Hài Lòng</div></div>
          <div className="stat"><div className="stat__number">{settings['stat_products'] || '500+'}</div><div className="stat__label">Mẫu Kính Đa Dạng</div></div>
          <div className="stat"><div className="stat__number">{settings['stat_brands'] || '50+'}</div><div className="stat__label">Thương Hiệu Premium</div></div>
          <div className="stat"><div className="stat__number">{settings['stat_rating'] || '4.9 ★'}</div><div className="stat__label">Đánh Giá Trung Bình</div></div>
        </div>
      </div>
    </section>
  );
}

// ── Reusable Slider with Navigation Arrows ──
function SliderWrap({ children, scrollRef }: { children: ReactNode; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };
  return (
    <div className="slider-wrap">
      <button className="slider-nav slider-nav--prev" onClick={() => scroll('left')} aria-label="Previous"><FiChevronLeft /></button>
      {children}
      <button className="slider-nav slider-nav--next" onClick={() => scroll('right')} aria-label="Next"><FiChevronRight /></button>
    </div>
  );
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

export function DynamicCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.getCategories(false)
      .then((data: any[]) => {
        // Only show active categories (backend may not filter)
        const active = Array.isArray(data) ? data.filter((c: any) => c.is_active !== false) : [];
        setCategories(active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="categories-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="category-card" style={{ opacity: 0.3, pointerEvents: 'none' }}>
            <div className="category-card__emoji"><RiGlassesLine /></div>
            <h3 className="category-card__name">Đang tải...</h3>
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <div className="categories-grid">
      {categories.map((cat: any) => (
        <Link key={cat.slug || cat.id} href={`/san-pham?category=${cat.slug}`} className="category-card">
          <div className="category-card__emoji">
            {cat.icon ? (
              <img src={cat.icon.startsWith('http') ? cat.icon : `${API_BASE}${cat.icon}`}
                alt="" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            ) : cat.image ? (
              <img src={cat.image.startsWith('http') ? cat.image : `${API_BASE}${cat.image}`}
                alt="" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px' }} />
            ) : (
              <RiGlassesLine style={{ fontSize: '2.5rem', color: 'var(--color-brand)' }} />
            )}
          </div>
          <h3 className="category-card__name">{cat.name}</h3>
          <p className="category-card__desc">{cat.description || 'Khám phá ngay'}</p>
          <span className="category-card__count">{cat.products_count || 0} sản phẩm</span>
          <div className="category-card__arrow"><FiArrowRight /></div>
        </Link>
      ))}
    </div>
  );
}

export function DynamicProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    publicApi.getProducts({ per_page: '8', featured: '1' })
      .then((res: any) => {
        let data = res?.data || res || [];
        if (!Array.isArray(data)) data = [];
        if (data.length === 0) {
          return publicApi.getProducts({ per_page: '8', sort: 'newest' });
        }
        return { data };
      })
      .then((res: any) => {
        let data = res?.data || res || [];
        if (!Array.isArray(data)) data = [];
        setProducts(data.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="product-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="product-card" style={{ opacity: 0.3, pointerEvents: 'none' }}>
            <div className="product-card__image">
              <div className="product-card__placeholder">
                <div className="product-card__placeholder-glasses">
                  <div className="placeholder-lens placeholder-lens--l" />
                  <div className="placeholder-bridge" />
                  <div className="placeholder-lens placeholder-lens--r" />
                </div>
              </div>
            </div>
            <div className="product-card__info">
              <h3 className="product-card__name">Đang tải...</h3>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <SliderWrap scrollRef={sliderRef}>
      <div className="product-slider" ref={sliderRef}>
        {products.map((p: any) => (
          <Link key={p.id} href={`/san-pham/${p.slug}`} className="product-card">
            <div className="product-card__image">
              {p.thumbnail ? (
                <img src={getImageUrl(p.thumbnail)!} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="product-card__placeholder">
                  <div className="product-card__placeholder-glasses">
                    <div className="placeholder-lens placeholder-lens--l" />
                    <div className="placeholder-bridge" />
                    <div className="placeholder-lens placeholder-lens--r" />
                  </div>
                </div>
              )}
              <div className="product-card__badge">
                {p.is_new && <span className="badge-new">Mới</span>}
                {p.sale_price && <span className="badge-sale">Sale</span>}
                {p.is_featured && <span className="badge-featured">Hot</span>}
              </div>
            </div>
            <div className="product-card__info">
              <div className="product-card__category">{p.category?.name || ''}</div>
              <h3 className="product-card__name">{p.name}</h3>
              <div className="product-card__price">
                <span className="product-card__price-current">
                  {formatPrice(p.sale_price || p.price)}
                </span>
                {p.sale_price && (
                  <span className="product-card__price-original">
                    {formatPrice(p.price)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </SliderWrap>
  );
}

// ── Default collections (fallback when API unavailable) ──
const DEFAULT_COLLECTIONS = [
  { name: 'Thanh Lịch', slug: 'thanh-lich', description: 'Tinh tế, sang trọng', tag: 'CLASSIC', size: 'tall', image: '' },
  { name: 'Năng Động', slug: 'nang-dong', description: 'Trẻ trung, phóng khoáng', tag: 'SPORT', size: 'normal', image: '' },
  { name: 'Vintage', slug: 'vintage', description: 'Hoài cổ, cá tính', tag: 'RETRO', size: 'normal', image: '' },
  { name: 'Tối Giản', slug: 'toi-gian', description: 'Nhẹ nhàng, tinh tế', tag: 'MINIMAL', size: 'wide', image: '' },
  { name: 'Sang Trọng', slug: 'sang-trong', description: 'Đẳng cấp cao cấp', tag: 'PREMIUM', size: 'normal', image: '' },
];

export function DynamicCollections() {
  const [collections, setCollections] = useState<any[]>(DEFAULT_COLLECTIONS);
  const [loaded, setLoaded] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    publicApi.getCollections()
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setCollections(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <SliderWrap scrollRef={sliderRef}>
      <div className="style-masonry" ref={sliderRef}>
        {collections.map((col: any, index: number) => (
          <Link
            key={col.slug || index}
            href={`/san-pham?style=${col.slug}`}
            className={`style-card style-card--${col.size || 'normal'}`}
            style={{ '--card-index': index } as React.CSSProperties}
          >
            {/* Background image */}
            {col.image ? (
              <img
                src={col.image.startsWith('http') ? col.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${col.image}`}
                alt={col.name}
                className="style-card__img"
                loading="lazy"
              />
            ) : (
              <div
                className="style-card__img style-card__img--placeholder"
                style={{
                  background: (col.gradient_from && col.gradient_to)
                    ? `linear-gradient(160deg, ${col.gradient_from} 0%, ${col.gradient_to} 100%)`
                    : '#e8e0d4',
                }}
              />
            )}

            {/* Overlay (always visible, darker on hover) */}
            <div className="style-card__overlay" />

            {/* Title (always visible at bottom) */}
            <h3 className="style-card__name">{col.name}</h3>

            {/* Hover content */}
            <div className="style-card__hover-info">
              {col.tag && <span className="style-card__tag">{col.tag}</span>}
              <p className="style-card__desc">{col.description}</p>
              <span className="style-card__cta">Khám phá <FiArrowRight /></span>
            </div>
          </Link>
        ))}
      </div>
    </SliderWrap>
  );
}

// ── Voucher Slider (nous.vn inspired) ──
const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(n) + 'đ';

export function DynamicVouchers() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('glass_token');
    setIsLoggedIn(!!token);

    // Always fetch public vouchers
    publicApi.getVouchers()
      .then((data: any) => {
        const publicVouchers = Array.isArray(data) ? data : [];
        
        // If logged in, also fetch user-specific vouchers
        if (token) {
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/vouchers`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
          })
            .then(r => r.json())
            .then((userData: any) => {
              const userVouchers = Array.isArray(userData) ? userData : [];
              // Merge, avoid duplicates by code
              const codes = new Set(publicVouchers.map((v: any) => v.code));
              const merged = [...publicVouchers, ...userVouchers.filter((v: any) => !codes.has(v.code))];
              setVouchers(merged);
            })
            .catch(() => setVouchers(publicVouchers));
        } else {
          setVouchers(publicVouchers);
        }
      })
      .catch(() => {});
  }, []);

  if (vouchers.length === 0 && isLoggedIn) return null;

  const copyCode = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {/* Login prompt for non-logged-in users */}
      {!isLoggedIn && (
        <div className="voucher-login-prompt">
          <FiGift className="voucher-login-prompt__icon" />
          <div>
            <strong>Đăng nhập để nhận mã giảm giá riêng!</strong>
            <p>Có nhiều voucher đặc biệt dành cho thành viên</p>
          </div>
          <Link href="/dang-nhap" className="voucher-login-prompt__btn">Đăng nhập</Link>
        </div>
      )}

      {vouchers.length > 0 && (
        <SliderWrap scrollRef={sliderRef}>
          <div className="voucher-slider">
            <div className="voucher-slider__track" ref={sliderRef}>
              {vouchers.map((v: any) => (
                <div key={v.id} className="voucher-slide">
                  {/* Left: Discount Value */}
                  <div className="voucher-slide__left">
                    <span className="voucher-slide__prefix">Giảm</span>
                    {v.type === 'percent' ? (
                      <span className="voucher-slide__number">{v.value}<span className="voucher-slide__unit">%</span></span>
                    ) : (
                      <span className="voucher-slide__number">
                        {v.value >= 1000000
                          ? (v.value / 1000000).toFixed(v.value % 1000000 === 0 ? 0 : 1) + 'M'
                          : Math.round(v.value / 1000) + 'K'
                        }
                      </span>
                    )}
                  </div>

                  {/* Cut line with scissors */}
                  <div className="voucher-slide__cutline">
                    <span className="voucher-slide__scissors">✂</span>
                  </div>

                  {/* Right: Info + Copy */}
                  <div className="voucher-slide__right">
                    <span className="voucher-slide__code">Mã: <strong>{v.code}</strong></span>
                    <p className="voucher-slide__condition">
                      {v.description || (v.min_order > 0 ? `Cho đơn từ ${formatVND(v.min_order)}` : 'Áp dụng mọi đơn hàng')}
                    </p>
                    {v.type === 'percent' && v.max_discount > 0 && (
                      <p className="voucher-slide__max">Tối đa {formatVND(v.max_discount)}</p>
                    )}
                    <div className="voucher-slide__footer">
                      <span className="voucher-slide__terms">Điều kiện áp dụng</span>
                      <button
                        className={`voucher-slide__copy ${copiedId === v.id ? 'voucher-slide__copy--copied' : ''}`}
                        onClick={() => copyCode(v.code, v.id)}
                      >
                        {copiedId === v.id ? <><FiCheck /> Đã copy</> : <><FiCopy /> Sao chép mã</>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SliderWrap>
      )}
    </div>
  );
}

// ── Consult Button (reads phone from settings) ──
export function DynamicConsultButton() {
  const { settings } = useSettings();
  const phone = settings['contact_phone'] || '0123456789';
  return (
    <div style={{ textAlign: 'center', marginTop: 'var(--space-3xl)' }}>
      <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn btn-primary btn-lg">
        Đặt Lịch Tư Vấn <FiArrowRight />
      </a>
    </div>
  );
}
