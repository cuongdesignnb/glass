'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { RiGlassesLine, RiSunLine, RiVipCrownLine, RiPriceTag3Line } from 'react-icons/ri';
import { FiArrowRight, FiCopy, FiCheck, FiGift, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

function getImageUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
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

const fbIcons: Record<string, string> = {
  'kinh-can': '👓', 'kinh-ram': '🕶️',
  'kinh-thoi-trang': '💎', 'gong-kinh': '🏷️'
};

const fbDesc: Record<string, string> = {
  'kinh-can': 'Gọng đẹp, tròng rõ', 'kinh-ram': 'Thời trang & bảo vệ',
  'kinh-thoi-trang': 'Phong cách cá nhân', 'gong-kinh': 'Chất liệu cao cấp'
};

export function DynamicCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.getCategories(false)
      .then((data: any[]) => {
        setCategories(data.slice(0, 4));
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

  const items = categories.length > 0 ? categories : [
    { name: 'Kính Cận', slug: 'kinh-can', products_count: 0, description: 'Gọng đẹp, tròng rõ' },
    { name: 'Kính Râm', slug: 'kinh-ram', products_count: 0, description: 'Thời trang & bảo vệ' },
    { name: 'Kính Thời Trang', slug: 'kinh-thoi-trang', products_count: 0, description: 'Phong cách cá nhân' },
    { name: 'Gọng Kính', slug: 'gong-kinh', products_count: 0, description: 'Chất liệu cao cấp' },
  ];

  return (
    <div className="categories-grid">
      {items.map((cat: any) => (
        <Link key={cat.slug} href={`/san-pham?category=${cat.slug}`} className="category-card">
          <div className="category-card__emoji">
            {cat.icon ? (
              <img src={cat.icon.startsWith('http') ? cat.icon : `${API_BASE}${cat.icon}`}
                alt="" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '2.5rem' }}>{fbIcons[cat.slug] || '👓'}</span>
            )}
          </div>
          <h3 className="category-card__name">{cat.name}</h3>
          <p className="category-card__desc">{cat.description || fbDesc[cat.slug] || 'Khám phá ngay'}</p>
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
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    publicApi.getVouchers()
      .then((data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          setVouchers(data);
        }
      })
      .catch(() => {});
  }, []);

  if (vouchers.length === 0) return null;

  const copyCode = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
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
  );
}
