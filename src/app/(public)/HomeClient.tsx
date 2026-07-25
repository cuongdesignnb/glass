'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { publicApi } from '@/lib/api';
import { useSettings } from '@/lib/useSettings';
import { RiGlassesLine } from 'react-icons/ri';
import { FiArrowRight, FiCopy, FiCheck, FiGift, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

function getImageUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

export function DynamicStats() {
  const { settings } = useSettings();
  return (
    <section className="section stats-section">
      <div className="container">
        <div className="stats-grid">
          <div className="stat"><div className="stat__number">{settings.stat_customers || '10,000+'}</div><div className="stat__label">Khách Hàng Hài Lòng</div></div>
          <div className="stat"><div className="stat__number">{settings.stat_products || '500+'}</div><div className="stat__label">Mẫu Kính Đa Dạng</div></div>
          <div className="stat"><div className="stat__number">{settings.stat_brands || '50+'}</div><div className="stat__label">Thương Hiệu Premium</div></div>
          <div className="stat"><div className="stat__number">{settings.stat_rating || '4.9 ★'}</div><div className="stat__label">Đánh Giá Trung Bình</div></div>
        </div>
      </div>
    </section>
  );
}

function SliderWrap({ children, scrollRef }: { children: ReactNode; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const scroll = (direction: 'left' | 'right') => {
    const target = scrollRef.current;
    if (!target) return;
    target.scrollBy({
      left: direction === 'left' ? -target.clientWidth * 0.7 : target.clientWidth * 0.7,
      behavior: 'smooth',
    });
  };

  return (
    <div className="slider-wrap">
      <button type="button" className="slider-nav slider-nav--prev" onClick={() => scroll('left')} aria-label="Trước"><FiChevronLeft /></button>
      {children}
      <button type="button" className="slider-nav slider-nav--next" onClick={() => scroll('right')} aria-label="Tiếp theo"><FiChevronRight /></button>
    </div>
  );
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

export function DynamicCategories({ initialData }: { initialData?: any[] }) {
  const [categories, setCategories] = useState<any[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) return;
    publicApi.getCategories(false)
      .then((data: any[]) => {
        const active = Array.isArray(data) ? data.filter((category: any) => category.is_active !== false) : [];
        setCategories(active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialData]);

  if (loading) {
    return (
      <div className="categories-grid">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="category-card" style={{ opacity: 0.3, pointerEvents: 'none' }}>
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
      {categories.map((category: any) => (
        <Link key={category.slug || category.id} href={`/san-pham?category=${category.slug}`} className="category-card">
          <div className="category-card__emoji">
            {category.icon ? (
              <Image src={category.icon.startsWith('http') ? category.icon : `${API_BASE}${category.icon}`} alt="" width={48} height={48} style={{ objectFit: 'contain' }} />
            ) : category.image ? (
              <Image src={category.image.startsWith('http') ? category.image : `${API_BASE}${category.image}`} alt="" width={48} height={48} style={{ objectFit: 'contain', borderRadius: '8px' }} />
            ) : (
              <RiGlassesLine style={{ fontSize: '2.5rem', color: 'var(--color-brand)' }} />
            )}
          </div>
          <h3 className="category-card__name">{category.name}</h3>
          <p className="category-card__desc">{category.description || 'Khám phá ngay'}</p>
          <span className="category-card__count">{category.products_count || 0} sản phẩm</span>
          <div className="category-card__arrow"><FiArrowRight /></div>
        </Link>
      ))}
    </div>
  );
}

export function DynamicProducts({ initialData }: { initialData?: any[] }) {
  const [products, setProducts] = useState<any[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) return;
    publicApi.getProducts({ per_page: '8', featured: '1' })
      .then(async (response: any) => {
        let data = response?.data || response || [];
        if (!Array.isArray(data)) data = [];
        if (data.length === 0) {
          const fallback = await publicApi.getProducts({ per_page: '8', sort: 'newest' });
          data = fallback?.data || fallback || [];
        }
        setProducts(Array.isArray(data) ? data.slice(0, 8) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialData]);

  if (loading) {
    return (
      <div className="product-grid">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="product-card" style={{ opacity: 0.3, pointerEvents: 'none' }}>
            <div className="product-card__image">
              <div className="product-card__placeholder">
                <div className="product-card__placeholder-glasses">
                  <div className="placeholder-lens placeholder-lens--l" />
                  <div className="placeholder-bridge" />
                  <div className="placeholder-lens placeholder-lens--r" />
                </div>
              </div>
            </div>
            <div className="product-card__info"><h3 className="product-card__name">Đang tải...</h3></div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <SliderWrap scrollRef={sliderRef}>
      <div className="product-slider" ref={sliderRef}>
        {products.map((product: any) => (
          <Link key={product.id} href={`/san-pham/${product.slug}`} className="product-card">
            <div className="product-card__image">
              {product.thumbnail ? (
                <Image src={getImageUrl(product.thumbnail)!} alt={product.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 250px" style={{ objectFit: 'cover' }} />
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
                {product.is_new && <span className="badge-new">Mới</span>}
                {product.sale_price && <span className="badge-sale">Sale</span>}
                {product.is_featured && <span className="badge-featured">Hot</span>}
              </div>
            </div>
            <div className="product-card__info">
              <div className="product-card__category">{product.category?.name || ''}</div>
              <h3 className="product-card__name">{product.name}</h3>
              <div className="product-card__price">
                <span className="product-card__price-current">{formatPrice(product.sale_price || product.price)}</span>
                {product.sale_price && <span className="product-card__price-original">{formatPrice(product.price)}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </SliderWrap>
  );
}

const formatVND = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';

export function DynamicVouchers({ initialData }: { initialData?: any[] }) {
  const [vouchers, setVouchers] = useState<any[]>(initialData || []);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('glass_token');
    setIsLoggedIn(Boolean(token));

    if (token) {
      const publicVouchers = initialData || [];
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/vouchers`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
        .then((response) => response.json())
        .then((userData: any) => {
          const userVouchers = Array.isArray(userData) ? userData : [];
          const codes = new Set(publicVouchers.map((voucher: any) => voucher.code));
          setVouchers([...publicVouchers, ...userVouchers.filter((voucher: any) => !codes.has(voucher.code))]);
        })
        .catch(() => {
          if (!initialData) {
            publicApi.getVouchers().then((data: any) => setVouchers(Array.isArray(data) ? data : [])).catch(() => {});
          } else {
            setVouchers(publicVouchers);
          }
        });
    } else if (!initialData) {
      publicApi.getVouchers().then((data: any) => setVouchers(Array.isArray(data) ? data : [])).catch(() => {});
    } else {
      setVouchers(initialData);
    }
  }, [initialData]);

  if (vouchers.length === 0 && isLoggedIn) return null;

  const copyCode = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {!isLoggedIn && (
        <div className="voucher-login-prompt">
          <FiGift className="voucher-login-prompt__icon" />
          <div><strong>Đăng nhập để nhận mã giảm giá riêng!</strong><p>Có nhiều voucher đặc biệt dành cho thành viên</p></div>
          <Link href="/dang-nhap" className="voucher-login-prompt__btn">Đăng nhập</Link>
        </div>
      )}

      {vouchers.length > 0 && (
        <SliderWrap scrollRef={sliderRef}>
          <div className="voucher-slider">
            <div className="voucher-slider__track" ref={sliderRef}>
              {vouchers.map((voucher: any) => (
                <div key={voucher.id} className="voucher-slide">
                  <div className="voucher-slide__left">
                    <span className="voucher-slide__prefix">Giảm</span>
                    {voucher.type === 'percent' ? (
                      <span className="voucher-slide__number">{voucher.value}<span className="voucher-slide__unit">%</span></span>
                    ) : (
                      <span className="voucher-slide__number">{voucher.value >= 1000000 ? (voucher.value / 1000000).toFixed(voucher.value % 1000000 === 0 ? 0 : 1) + 'M' : Math.round(voucher.value / 1000) + 'K'}</span>
                    )}
                  </div>
                  <div className="voucher-slide__cutline"><span className="voucher-slide__scissors">✂</span></div>
                  <div className="voucher-slide__right">
                    <span className="voucher-slide__code">Mã: <strong>{voucher.code}</strong></span>
                    <p className="voucher-slide__condition">{voucher.description || (voucher.min_order > 0 ? `Cho đơn từ ${formatVND(voucher.min_order)}` : 'Áp dụng mọi đơn hàng')}</p>
                    {voucher.type === 'percent' && voucher.max_discount > 0 && <p className="voucher-slide__max">Tối đa {formatVND(voucher.max_discount)}</p>}
                    <div className="voucher-slide__footer">
                      <span className="voucher-slide__terms">Điều kiện áp dụng</span>
                      <button type="button" className={`voucher-slide__copy ${copiedId === voucher.id ? 'voucher-slide__copy--copied' : ''}`} onClick={() => copyCode(voucher.code, voucher.id)}>
                        {copiedId === voucher.id ? <><FiCheck /> Đã copy</> : <><FiCopy /> Sao chép mã</>}
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

export function DynamicConsultButton() {
  const { settings } = useSettings();
  const phone = settings.contact_phone || '0123456789';
  return (
    <div style={{ textAlign: 'center', marginTop: 'var(--space-3xl)' }}>
      <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn btn-primary btn-lg">Đặt Lịch Tư Vấn <FiArrowRight /></a>
    </div>
  );
}
