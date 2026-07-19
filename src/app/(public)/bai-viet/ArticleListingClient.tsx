'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { articleListingUrl, type ArticleListingFilters } from '@/lib/listing-params';
import { FiSearch, FiArrowRight, FiEye, FiCalendar, FiChevronLeft, FiChevronRight, FiBookOpen, FiFileText, FiMessageSquare, FiTrendingUp, FiTool, FiBook, FiBell, FiStar, FiFile } from 'react-icons/fi';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'tu-van': <FiMessageSquare />, 'xu-huong': <FiTrendingUp />, 'cham-soc': <FiTool />,
  'kien-thuc': <FiBook />, 'tin-tuc': <FiBell />, review: <FiStar />,
};

function formatDateVi(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getInitials(name: string) {
  if (!name) return 'G';
  return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
}

function buildImageUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${path}`;
}

type ArticleListingClientProps = {
  initialArticles: any[];
  initialPagination: { currentPage: number; lastPage: number; total: number };
  initialCategories: any[];
  initialFilters: ArticleListingFilters;
};

export default function ArticleListingClient({ initialArticles, initialPagination, initialCategories, initialFilters }: ArticleListingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialFilters);
  const filtersRef = useRef(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const articles = initialArticles;
  const pagination = initialPagination;
  const loading = isPending;
  const activeCategory = filters.category;
  const search = filters.search;
  const sort = filters.sort;
  const page = Number(filters.page);
  const categories = useMemo(() => [
    { slug: '', label: 'Tất Cả', icon: <FiFileText /> },
    ...initialCategories.map((category) => ({
      slug: String(category.slug || ''),
      label: String(category.name || category.slug || ''),
      icon: CATEGORY_ICONS[String(category.slug || '')] || <FiFileText />,
    })),
  ], [initialCategories]);

  useEffect(() => {
    filtersRef.current = initialFilters;
    setFilters(initialFilters);
    setSearchInput(initialFilters.search);
  }, [initialFilters]);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const navigate = (nextFilters: ArticleListingFilters) => {
    filtersRef.current = nextFilters;
    setFilters(nextFilters);
    startTransition(() => router.push(articleListingUrl(nextFilters), { scroll: false }));
  };

  const handleCategory = (slug: string) => {
    navigate({ ...filtersRef.current, category: slug, page: '1' });
  };

  const handleSearch = (val: string) => {
    setSearchInput(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => navigate({ ...filtersRef.current, search: val, page: '1' }), 500);
  };

  const featuredArticle = articles.find((a) => a.is_featured) || articles[0];
  const gridArticles = featuredArticle
    ? articles.filter((a) => a.id !== featuredArticle.id)
    : articles;

  return (
    <>
      {/* Header */}
      <div className="articles-header">
        <div className="container">
          <div className="articles-header__label">
            <FiBookOpen /> Nhật Ký Kính Mắt
          </div>
          <h1 className="articles-header__title">Bài Viết & Kiến Thức</h1>
          <p className="articles-header__sub">
            Khám phá xu hướng mới nhất, mẹo chăm sóc và kiến thức về kính mắt từ các chuyên gia
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="articles-categories">
        <div className="container">
          <div className="articles-categories__inner">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                className={`articles-cat-btn ${activeCategory === cat.slug ? 'articles-cat-btn--active' : ''}`}
                onClick={() => handleCategory(cat.slug)}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-4xl)' }}>
        {/* Toolbar */}
        <div className="articles-toolbar">
          <div className="articles-toolbar__search">
            <FiSearch />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="articles-toolbar__right">
            <span className="articles-toolbar__count">
              {loading ? '...' : `${pagination.total || 0} bài viết`}
            </span>
            <select
              value={sort}
              onChange={(e) => navigate({ ...filtersRef.current, sort: e.target.value, page: '1' })}
              className="articles-toolbar__sort"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="popular">Nhiều lượt xem</option>
            </select>
          </div>
        </div>

        {loading ? (
          /* Skeleton */
          <div>
            <div className="article-skeleton" style={{ marginBottom: 'var(--space-3xl)', height: '340px' }}>
              <div className="skeleton" style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="articles-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="article-skeleton">
                  <div className="article-skeleton__image skeleton" />
                  <div className="article-skeleton__body">
                    <div className="skeleton" style={{ height: '14px', width: '40%', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ height: '18px', width: '90%', marginBottom: '6px' }} />
                    <div className="skeleton" style={{ height: '14px', width: '70%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="articles-empty">
            <div className="articles-empty__icon"><FiFile /></div>
            <h3>Không tìm thấy bài viết</h3>
            <p>Thử chọn danh mục khác hoặc thay đổi từ khóa tìm kiếm</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-lg)' }}
              onClick={() => { setSearchInput(''); navigate({ category: '', search: '', sort: 'newest', page: '1' }); }}
            >
              Xem tất cả bài viết
            </button>
          </div>
        ) : (
          <>
            {/* Featured Article */}
            {featuredArticle && page === 1 && !search && !activeCategory && (
              <Link href={`/bai-viet/${featuredArticle.slug}`} className="article-featured">
                <div className="article-featured__image">
                  {featuredArticle.thumbnail ? (
                    <Image
                      src={buildImageUrl(featuredArticle.thumbnail)}
                      alt={featuredArticle.title}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 600px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="article-featured__placeholder"><FiFileText /></div>
                  )}
                  {featuredArticle.is_featured && (
                    <span className="article-featured__badge"><FiStar /> Bài nổi bật</span>
                  )}
                </div>
                <div className="article-featured__body">
                  {featuredArticle.tags?.[0] && (
                    <span className="article-featured__tag">
                      {categories.find(c => c.slug === featuredArticle.tags[0])?.icon || <FiFileText />}
                      {categories.find(c => c.slug === featuredArticle.tags[0])?.label || featuredArticle.tags[0]}
                    </span>
                  )}
                  <h2 className="article-featured__title">{featuredArticle.title}</h2>
                  {featuredArticle.excerpt && (
                    <p className="article-featured__excerpt">{featuredArticle.excerpt}</p>
                  )}
                  <div className="article-featured__meta">
                    <div className="article-featured__author">
                      <div className="article-featured__avatar">{getInitials(featuredArticle.author || 'Glass')}</div>
                      <div>
                        <div className="article-featured__author-name">{featuredArticle.author || 'Glass Team'}</div>
                        <div className="article-featured__date">{formatDateVi(featuredArticle.published_at || featuredArticle.created_at)}</div>
                      </div>
                    </div>
                    {featuredArticle.views > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
                        <FiEye /> {featuredArticle.views.toLocaleString()} lượt xem
                      </div>
                    )}
                  </div>
                  <span className="article-featured__cta">
                    Đọc bài viết <FiArrowRight />
                  </span>
                </div>
              </Link>
            )}

            {/* Articles Grid */}
            {gridArticles.length > 0 && (
              <div className="articles-grid">
                {(page === 1 && !search && !activeCategory ? gridArticles : articles).map((article: any) => (
                  <Link key={article.id} href={`/bai-viet/${article.slug}`} className="article-card">
                    <div className="article-card__image">
                      {article.thumbnail ? (
                        <Image
                          src={buildImageUrl(article.thumbnail)}
                          alt={article.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 360px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="article-card__image-placeholder"><FiFileText /></div>
                      )}
                      {article.tags?.[0] && (
                        <span className="article-card__tag">
                          {categories.find(c => c.slug === article.tags[0])?.label || article.tags[0]}
                        </span>
                      )}
                    </div>
                    <div className="article-card__body">
                      <h3 className="article-card__title">{article.title}</h3>
                      {article.excerpt && (
                        <p className="article-card__excerpt">{article.excerpt}</p>
                      )}
                      <div className="article-card__footer">
                        <div className="article-card__meta">
                          <div className="article-card__author-avatar">{getInitials(article.author || 'G')}</div>
                          <div>
                            <div className="article-card__author-name">{article.author || 'Glass Team'}</div>
                            <div className="article-card__date">{formatDateVi(article.published_at || article.created_at)}</div>
                          </div>
                        </div>
                        <div className="article-card__stats">
                          {article.views > 0 && (
                            <span className="article-card__stat"><FiEye /> {article.views.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.lastPage > 1 && (
              <div className="articles-pagination">
                <button
                  className="articles-pagination__btn"
                  disabled={page === 1}
                  onClick={() => navigate({ ...filtersRef.current, page: String(page - 1) })}
                >
                  <FiChevronLeft /> Trước
                </button>
                {Array.from({ length: Math.min(pagination.lastPage, 7) }, (_, i) => {
                  const pageNum = pagination.lastPage <= 7
                    ? i + 1
                    : page <= 4
                      ? i + 1
                      : page >= pagination.lastPage - 3
                        ? pagination.lastPage - 6 + i
                        : page - 3 + i;
                  if (pageNum < 1 || pageNum > pagination.lastPage) return null;
                  return (
                    <button
                      key={pageNum}
                      className={`articles-pagination__btn ${page === pageNum ? 'articles-pagination__btn--active' : ''}`}
                      onClick={() => navigate({ ...filtersRef.current, page: String(pageNum) })}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="articles-pagination__btn"
                  disabled={page === pagination.lastPage}
                  onClick={() => navigate({ ...filtersRef.current, page: String(page + 1) })}
                >
                  Sau <FiChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
