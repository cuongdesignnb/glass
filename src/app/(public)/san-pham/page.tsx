'use client';

import { publicApi } from '@/lib/api';
import { GENDERS, FACE_SHAPES, FRAME_STYLES, MATERIALS, COLORS, SORT_OPTIONS, formatPrice } from '@/lib/constants';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { FiFilter, FiX, FiChevronDown, FiGrid, FiList, FiSearch } from 'react-icons/fi';
import { RiGlassesLine } from 'react-icons/ri';
import './products.css';

export default function ProductListingPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>({});
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter state
  const [filters, setFilters] = useState({
    gender: '',
    color: '',
    face_shape: '',
    frame_style: '',
    material: '',
    price_min: '',
    price_max: '',
    sort: 'newest',
    search: '',
    page: '1',
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const data = await publicApi.getProducts(params);
      setProducts(data.data || []);
      setPagination({
        currentPage: data.current_page,
        lastPage: data.last_page,
        total: data.total,
      });
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Dynamic filter options from API
  const [filterOptions, setFilterOptions] = useState<{
    genders: string[]; face_shapes: string[]; frame_styles: string[];
    materials: string[]; colors: { value: string; name: string }[]; brands: string[];
  } | null>(null);

  // Label helpers - use constants as label map, fallback to raw value
  const genderLabel = (v: string) => GENDERS.find(g => g.value === v)?.label || v;
  const faceLabel = (v: string) => FACE_SHAPES.find(f => f.value === v)?.label || v;
  const frameLabel = (v: string) => FRAME_STYLES.find(f => f.value === v)?.label || v;
  const materialLabel = (v: string) => MATERIALS.find(m => m.value === v)?.label || v;

  useEffect(() => {
    publicApi.getProductFilters().then(setFilterOptions).catch(console.error);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: '1' }));
  };

  const clearFilters = () => {
    setFilters({
      gender: '', color: '', face_shape: '', frame_style: '',
      material: '', price_min: '', price_max: '', sort: 'newest',
      search: '', page: '1',
    });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && !['sort', 'page', 'search'].includes(key)
  ).length;

  return (
    <div style={{ paddingTop: 'var(--header-height)' }}>
      {/* Page Header */}
      <div className="products-header">
        <div className="container">
          <h1 className="heading-lg" style={{ color: 'var(--color-text-heading)' }}>Bộ Sưu Tập Kính Mắt</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Tìm kiếm chiếc kính hoàn hảo cho phong cách của bạn
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-4xl)' }}>
        {/* Toolbar */}
        <div className="products-toolbar">
          <div className="products-toolbar__left">
            <button
              className="btn btn-dark btn-sm mobile-filter-btn"
              onClick={() => setShowMobileFilter(true)}
            >
              <FiFilter /> Bộ lọc {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            <span className="products-toolbar__count">
              {pagination.total || 0} sản phẩm
            </span>
          </div>
          <div className="products-toolbar__right">
            <div className="products-toolbar__search">
              <FiSearch />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>
            <select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="products-toolbar__sort"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="products-toolbar__view">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
                <FiGrid />
              </button>
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                <FiList />
              </button>
            </div>
          </div>
        </div>

        <div className="products-layout">
          {/* Filter Sidebar */}
          <aside className={`filter-sidebar ${showMobileFilter ? 'filter-sidebar--open' : ''}`}>
            <div className="filter-sidebar__header">
              <h3>Bộ Lọc</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="filter-sidebar__clear">
                  Xóa tất cả
                </button>
              )}
              <button className="filter-sidebar__close" onClick={() => setShowMobileFilter(false)}>
                <FiX />
              </button>
            </div>

            {/* Gender */}
            <div className="filter-group">
              <div className="filter-group__title">Giới Tính</div>
              <div className="filter-group__items">
                {(filterOptions?.genders || GENDERS.map(g => g.value)).map(v => (
                  <label key={v} className="filter-checkbox">
                    <input
                      type="radio"
                      name="gender"
                      checked={filters.gender === v}
                      onChange={() => updateFilter('gender', filters.gender === v ? '' : v)}
                    />
                    <span className="filter-checkbox__label">{genderLabel(v)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="filter-group">
              <div className="filter-group__title">Màu Sắc</div>
              <div className="filter-colors">
                {(filterOptions?.colors || COLORS.map(c => ({ value: c.value, name: c.name }))).map(c => (
                  <button
                    key={c.value}
                    className={`filter-color ${filters.color === c.value ? 'filter-color--active' : ''}`}
                    style={{ backgroundColor: c.value === 'transparent' ? undefined : c.value }}
                    data-color={c.value}
                    onClick={() => updateFilter('color', filters.color === c.value ? '' : c.value)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Face Shape */}
            <div className="filter-group">
              <div className="filter-group__title">Khuôn Mặt Phù Hợp</div>
              <div className="filter-group__items">
                {(filterOptions?.face_shapes || FACE_SHAPES.map(f => f.value)).map(v => (
                  <label key={v} className="filter-checkbox">
                    <input
                      type="radio"
                      name="face_shape"
                      checked={filters.face_shape === v}
                      onChange={() => updateFilter('face_shape', filters.face_shape === v ? '' : v)}
                    />
                    <span className="filter-checkbox__label">{faceLabel(v)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Frame Style */}
            <div className="filter-group">
              <div className="filter-group__title">Kiểu Gọng</div>
              <div className="filter-group__items">
                {(filterOptions?.frame_styles || FRAME_STYLES.map(f => f.value)).map(v => (
                  <label key={v} className="filter-checkbox">
                    <input
                      type="radio"
                      name="frame_style"
                      checked={filters.frame_style === v}
                      onChange={() => updateFilter('frame_style', filters.frame_style === v ? '' : v)}
                    />
                    <span className="filter-checkbox__label">{frameLabel(v)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Material */}
            <div className="filter-group">
              <div className="filter-group__title">Chất Liệu</div>
              <div className="filter-group__items">
                {(filterOptions?.materials || MATERIALS.map(m => m.value)).map(v => (
                  <label key={v} className="filter-checkbox">
                    <input
                      type="radio"
                      name="material"
                      checked={filters.material === v}
                      onChange={() => updateFilter('material', filters.material === v ? '' : v)}
                    />
                    <span className="filter-checkbox__label">{materialLabel(v)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="filter-group">
              <div className="filter-group__title">Khoảng Giá</div>
              <div className="filter-price-range">
                <input
                  type="number"
                  placeholder="Từ"
                  value={filters.price_min}
                  onChange={(e) => updateFilter('price_min', e.target.value)}
                />
                <span>—</span>
                <input
                  type="number"
                  placeholder="Đến"
                  value={filters.price_max}
                  onChange={(e) => updateFilter('price_max', e.target.value)}
                />
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="products-content">
            {loading ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="product-card-skeleton">
                    <div className="skeleton" style={{ aspectRatio: '4/3' }} />
                    <div style={{ padding: '16px' }}>
                      <div className="skeleton" style={{ height: '12px', width: '60%', marginBottom: '8px' }} />
                      <div className="skeleton" style={{ height: '18px', width: '80%', marginBottom: '12px' }} />
                      <div className="skeleton" style={{ height: '16px', width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="products-empty">
                <RiGlassesLine style={{ fontSize: '64px', color: 'var(--color-gray-400)', marginBottom: '16px' }} />
                <h3>Không tìm thấy sản phẩm</h3>
                <p>Thử thay đổi bộ lọc để tìm sản phẩm phù hợp</p>
                <button onClick={clearFilters} className="btn btn-primary" style={{ marginTop: '16px' }}>
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <>
                <div className={`product-grid ${viewMode === 'list' ? 'product-grid--list' : ''}`}>
                  {products.map((product: any) => (
                    <Link key={product.id} href={`/san-pham/${product.slug}`} className="product-card">
                      <div className="product-card__image">
                        {product.thumbnail ? (
                          <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api','')}${product.thumbnail}`} alt={product.name} />
                        ) : (
                          <div className="product-card__placeholder">
                            <RiGlassesLine />
                          </div>
                        )}
                        <div className="product-card__badge">
                          {product.is_new && <span className="badge-new">Mới</span>}
                          {product.sale_price && <span className="badge-sale">Sale</span>}
                          {product.is_featured && <span className="badge-featured">Hot</span>}
                        </div>
                      </div>
                      <div className="product-card__info">
                        <div className="product-card__category">{product.category?.name}</div>
                        <h3 className="product-card__name">{product.name}</h3>
                        {product.colors && (
                          <div className="product-card__colors">
                            {(product.colors as string[]).slice(0, 5).map((color, i) => (
                              <span key={i} className="product-card__color-dot" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                        )}
                        <div className="product-card__price">
                          <span className="product-card__price-current">
                            {formatPrice(product.sale_price || product.price)}
                          </span>
                          {product.sale_price && (
                            <span className="product-card__price-original">
                              {formatPrice(product.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.lastPage > 1 && (
                  <div className="pagination">
                    {Array.from({ length: pagination.lastPage }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`pagination__btn ${pagination.currentPage === page ? 'pagination__btn--active' : ''}`}
                        onClick={() => setFilters(prev => ({ ...prev, page: String(page) }))}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
