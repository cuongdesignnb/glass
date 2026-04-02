'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { RiGlassesLine, RiSunLine, RiVipCrownLine, RiPriceTag3Line } from 'react-icons/ri';
import { FiArrowRight } from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

function getImageUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
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
    <div className="product-grid">
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
  );
}
