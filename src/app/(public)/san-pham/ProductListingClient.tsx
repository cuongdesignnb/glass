"use client";

import {
  GENDERS,
  FACE_SHAPES,
  FRAME_STYLES,
  MATERIALS,
  COLORS,
  SORT_OPTIONS,
  formatPrice,
} from "@/lib/constants";
import { productListingUrl, type ProductListingFilters } from "@/lib/listing-params";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useTransition } from "react";
import {
  FiFilter,
  FiX,
  FiChevronDown,
  FiGrid,
  FiList,
  FiSearch,
} from "react-icons/fi";
import { RiGlassesLine } from "react-icons/ri";
import "./products.css";

type ProductListingClientProps = {
  initialProducts: any[];
  initialPagination: { currentPage: number; lastPage: number; total: number };
  initialCategories: any[];
  initialAttributes: Record<string, { value: string; label: string; extra?: string }[]>;
  initialFilters: ProductListingFilters;
};

export default function ProductListingClient({
  initialProducts,
  initialPagination,
  initialCategories,
  initialAttributes,
  initialFilters,
}: ProductListingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const products = initialProducts;
  const pagination = initialPagination;
  const categories = initialCategories;
  const attrs = initialAttributes;
  const loading = isPending;
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceMinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceMaxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filters, setFilters] = useState<ProductListingFilters>(initialFilters);
  const filtersRef = useRef(initialFilters);

  // Debounced search/price text (not sent to API until debounce fires)
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [priceMinInput, setPriceMinInput] = useState(initialFilters.price_min);
  const [priceMaxInput, setPriceMaxInput] = useState(initialFilters.price_max);

  useEffect(() => {
    filtersRef.current = initialFilters;
    setFilters(initialFilters);
    setSearchInput(initialFilters.search);
    setPriceMinInput(initialFilters.price_min);
    setPriceMaxInput(initialFilters.price_max);
  }, [initialFilters]);

  // Use dynamic attrs with fallback to constants
  const genders =
    attrs.gender || GENDERS.map((g) => ({ value: g.value, label: g.label }));
  const faceShapes =
    attrs.face_shape ||
    FACE_SHAPES.map((f) => ({ value: f.value, label: f.label }));
  const frameStyles =
    attrs.frame_style ||
    FRAME_STYLES.map((f) => ({ value: f.value, label: f.label }));
  const materials =
    attrs.material ||
    MATERIALS.map((m) => ({ value: m.value, label: m.label }));
  const colors =
    attrs.color ||
    COLORS.map((c) => ({ value: c.value, label: c.name, extra: c.value }));

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (priceMinTimerRef.current) clearTimeout(priceMinTimerRef.current);
    if (priceMaxTimerRef.current) clearTimeout(priceMaxTimerRef.current);
  }, []);

  const navigate = (nextFilters: ProductListingFilters) => {
    filtersRef.current = nextFilters;
    setFilters(nextFilters);
    startTransition(() => router.push(productListingUrl(nextFilters), { scroll: false }));
  };

  const updateFilter = (key: keyof ProductListingFilters, value: string) => {
    navigate({ ...filtersRef.current, [key]: value, page: "1" });
  };

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      navigate({ ...filtersRef.current, search: value, page: "1" });
    }, 500);
  };

  // Debounce price inputs
  const handlePriceMinChange = (value: string) => {
    setPriceMinInput(value);
    if (priceMinTimerRef.current) clearTimeout(priceMinTimerRef.current);
    priceMinTimerRef.current = setTimeout(() => {
      navigate({ ...filtersRef.current, price_min: value, page: "1" });
    }, 800);
  };

  const handlePriceMaxChange = (value: string) => {
    setPriceMaxInput(value);
    if (priceMaxTimerRef.current) clearTimeout(priceMaxTimerRef.current);
    priceMaxTimerRef.current = setTimeout(() => {
      navigate({ ...filtersRef.current, price_max: value, page: "1" });
    }, 800);
  };

  const clearFilters = () => {
    const cleared: ProductListingFilters = {
      gender: "",
      color: "",
      face_shape: "",
      frame_style: "",
      material: "",
      category_slug: "",
      price_min: "",
      price_max: "",
      sort: "newest",
      search: "",
      page: "1",
    };
    setSearchInput("");
    setPriceMinInput("");
    setPriceMaxInput("");
    navigate(cleared);
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && !["sort", "page", "search"].includes(key),
  ).length;

  return (
    <>
      {/* Page Header */}
      <div className="products-header">
        <div className="container">
          <h1
            className="heading-lg"
            style={{ color: "var(--color-text-heading)" }}
          >
            Bộ Sưu Tập Kính Mắt
          </h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "8px" }}>
            Tìm kiếm chiếc kính hoàn hảo cho phong cách của bạn
          </p>
        </div>
      </div>

      <div
        className="container"
        style={{
          paddingTop: "var(--space-2xl)",
          paddingBottom: "var(--space-4xl)",
        }}
      >
        {/* Toolbar */}
        <div className="products-toolbar">
          <div className="products-toolbar__left">
            <button
              className="btn btn-dark btn-sm mobile-filter-btn"
              onClick={() => setShowMobileFilter(true)}
            >
              <FiFilter /> Bộ lọc{" "}
              {activeFilterCount > 0 && `(${activeFilterCount})`}
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
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <select
              value={filters.sort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className="products-toolbar__sort"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="products-toolbar__view">
              <button
                className={viewMode === "grid" ? "active" : ""}
                onClick={() => setViewMode("grid")}
              >
                <FiGrid />
              </button>
              <button
                className={viewMode === "list" ? "active" : ""}
                onClick={() => setViewMode("list")}
              >
                <FiList />
              </button>
            </div>
          </div>
        </div>

        <div className="products-layout">
          {/* Filter Sidebar */}
          <aside
            className={`filter-sidebar ${showMobileFilter ? "filter-sidebar--open" : ""}`}
          >
            <div className="filter-sidebar__header">
              <h3>Bộ Lọc</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="filter-sidebar__clear"
                >
                  Xóa tất cả
                </button>
              )}
              <button
                className="filter-sidebar__close"
                onClick={() => setShowMobileFilter(false)}
              >
                <FiX />
              </button>
            </div>

            {/* Category */}
            {categories.length > 0 && (
              <div className="filter-group">
                <div className="filter-group__title">Danh Mục</div>
                <div className="filter-group__items">
                  {categories.map((c: any) => (
                    <label key={c.slug} className="filter-checkbox">
                      <input
                        type="radio"
                        name="category"
                        checked={filters.category_slug === c.slug}
                        onChange={() =>
                          updateFilter(
                            "category_slug",
                            filters.category_slug === c.slug ? "" : c.slug,
                          )
                        }
                      />
                      <span className="filter-checkbox__label">
                        {c.name} ({c.products_count || 0})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Gender */}
            <div className="filter-group">
              <div className="filter-group__title">Giới Tính</div>
              <div className="filter-group__items">
                {genders.map((g: any) => (
                  <label key={g.value} className="filter-checkbox">
                    <input
                      type="radio"
                      name="gender"
                      checked={filters.gender === g.value}
                      onChange={() =>
                        updateFilter(
                          "gender",
                          filters.gender === g.value ? "" : g.value,
                        )
                      }
                    />
                    <span className="filter-checkbox__label">{g.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="filter-group">
              <div className="filter-group__title">Màu Sắc</div>
              <div className="filter-colors">
                {colors.map((c: any) => {
                  const hex = c.extra || c.value;
                  return (
                    <button
                      key={c.value}
                      className={`filter-color ${filters.color === hex ? "filter-color--active" : ""}`}
                      style={{
                        backgroundColor:
                          hex === "transparent" ? undefined : hex,
                      }}
                      data-color={hex}
                      onClick={() =>
                        updateFilter("color", filters.color === hex ? "" : hex)
                      }
                      title={c.label}
                    />
                  );
                })}
              </div>
            </div>

            {/* Face Shape */}
            <div className="filter-group">
              <div className="filter-group__title">Khuôn Mặt Phù Hợp</div>
              <div className="filter-group__items">
                {faceShapes.map((f: any) => (
                  <label key={f.value} className="filter-checkbox">
                    <input
                      type="radio"
                      name="face_shape"
                      checked={filters.face_shape === f.value}
                      onChange={() =>
                        updateFilter(
                          "face_shape",
                          filters.face_shape === f.value ? "" : f.value,
                        )
                      }
                    />
                    <span className="filter-checkbox__label">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Frame Style */}
            <div className="filter-group">
              <div className="filter-group__title">Kiểu Gọng</div>
              <div className="filter-group__items">
                {frameStyles.map((f: any) => (
                  <label key={f.value} className="filter-checkbox">
                    <input
                      type="radio"
                      name="frame_style"
                      checked={filters.frame_style === f.value}
                      onChange={() =>
                        updateFilter(
                          "frame_style",
                          filters.frame_style === f.value ? "" : f.value,
                        )
                      }
                    />
                    <span className="filter-checkbox__label">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Material */}
            <div className="filter-group">
              <div className="filter-group__title">Chất Liệu</div>
              <div className="filter-group__items">
                {materials.map((m: any) => (
                  <label key={m.value} className="filter-checkbox">
                    <input
                      type="radio"
                      name="material"
                      checked={filters.material === m.value}
                      onChange={() =>
                        updateFilter(
                          "material",
                          filters.material === m.value ? "" : m.value,
                        )
                      }
                    />
                    <span className="filter-checkbox__label">{m.label}</span>
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
                  value={priceMinInput}
                  onChange={(e) => handlePriceMinChange(e.target.value)}
                />
                <span>—</span>
                <input
                  type="number"
                  placeholder="Đến"
                  value={priceMaxInput}
                  onChange={(e) => handlePriceMaxChange(e.target.value)}
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
                    <div className="skeleton" style={{ aspectRatio: "4/3" }} />
                    <div style={{ padding: "16px" }}>
                      <div
                        className="skeleton"
                        style={{
                          height: "12px",
                          width: "60%",
                          marginBottom: "8px",
                        }}
                      />
                      <div
                        className="skeleton"
                        style={{
                          height: "18px",
                          width: "80%",
                          marginBottom: "12px",
                        }}
                      />
                      <div
                        className="skeleton"
                        style={{ height: "16px", width: "40%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="products-empty">
                <RiGlassesLine
                  style={{
                    fontSize: "64px",
                    color: "var(--color-gray-400)",
                    marginBottom: "16px",
                  }}
                />
                <h3>Không tìm thấy sản phẩm</h3>
                <p>Thử thay đổi bộ lọc để tìm sản phẩm phù hợp</p>
                <button
                  onClick={clearFilters}
                  className="btn btn-primary"
                  style={{ marginTop: "16px" }}
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <>
                <div
                  className={`product-grid ${viewMode === "list" ? "product-grid--list" : ""}`}
                >
                  {products.map((product: any, index: number) => (
                    <Link
                      key={product.id}
                      href={`/san-pham/${product.slug}`}
                      className="product-card"
                    >
                      <div className="product-card__image">
                        {product.thumbnail ? (
                          <Image
                            src={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}${product.thumbnail}`}
                            alt={product.name}
                            fill
                            priority={index === 0}
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 250px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="product-card__placeholder">
                            <RiGlassesLine />
                          </div>
                        )}
                        <div className="product-card__badge">
                          {product.is_new && (
                            <span className="badge-new">Mới</span>
                          )}
                          {product.sale_price && (
                            <span className="badge-sale">Sale</span>
                          )}
                          {product.is_featured && (
                            <span className="badge-featured">Hot</span>
                          )}
                        </div>
                      </div>
                      <div className="product-card__info">
                        <div className="product-card__category">
                          {product.category?.name}
                        </div>
                        <h3 className="product-card__name">{product.name}</h3>
                        {product.colors && (
                          <div className="product-card__colors">
                            {(product.colors as string[])
                              .slice(0, 5)
                              .map((color, i) => (
                                <span
                                  key={i}
                                  className="product-card__color-dot"
                                  style={{ backgroundColor: color }}
                                />
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
                    {Array.from(
                      { length: pagination.lastPage },
                      (_, i) => i + 1,
                    ).map((page) => (
                      <button
                        key={page}
                        className={`pagination__btn ${pagination.currentPage === page ? "pagination__btn--active" : ""}`}
                        onClick={() => navigate({ ...filtersRef.current, page: String(page) })}
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
    </>
  );
}
