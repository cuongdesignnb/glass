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
    { slug: '', label: 'Táº¥t Cáº£', icon: <FiFileText /> },
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

  const syncFilters = (nextFilters: ArticleListingFilters) => {
    filtersRef.current = nextFilters;
    setFilters(nextFilters);
  };

  const navigate = (nextFilters: ArticleListingFilters, mode: 'push' | 'replace' = 'push') => {
    syncFilters(nextFilters);
    startTransition(() => {
      const href = articleListingUrl(nextFilters);
      if (mode === 'replace') {
        router.replace(href, { scroll: false });
      } else {
        router.push(href, { scroll: false });
      }
    });
  };

  const handleSearch = (val: string) => {
    setSearchInput(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => navigate({ ...filtersRef.current, search: val, page: '1' }, 'replace'), 500);
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
            <FiBookOpen /> Nháº­t KÃ½ KÃ­nh Máº¯t
          </div>
          <h1 className="articles-header__title">BÃ i Viáº¿t & Kiáº¿n Thá»©c</h1>
          <p className="articles-header__sub">
            KhÃ¡m phÃ¡ xu hÆ°á»›ng má»›i nháº¥t, máº¹o chÄƒm sÃ³c vÃ  kiáº¿n thá»©c vá» kÃ­nh máº¯t tá»« cÃ¡c chuyÃªn gia
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="articles-categories">
        <div className="container">
          <div className="articles-categories__inner">
            {categories.map((cat) => {
              const nextFilters = { ...filtersRef.current, category: cat.slug, page: '1' };
              return (
                <Link
                  key={cat.slug}
                  className={`articles-cat-btn ${activeCategory === cat.slug ? 'articles-cat-btn--active' : ''}`}
                  href={articleListingUrl(nextFilters)}
                  onClick={() => syncFilters(nextFilters)}
                  aria-current={activeCategory === cat.slug ? 'page' : undefined}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </Link>
              );
            })}
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
              placeholder="TÃ¬m kiáº¿m bÃ i viáº¿t..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="articles-toolbar__right">
            <span className="articles-toolbar__count">
              {loading ? '...' : `${pagination.total || 0} bÃ i viáº¿t`}
            </span>
            <select
              value={sort}
              onChange={(e) => navigate({ ...filtersRef.current, sort: e.target.value, page: '1' })}
              className="articles-toolbar__sort"
              disabled
              aria-label="Article sort is fixed to newest until backend sort is implemented"
            >
              <option value="newest">Má»›i nháº¥t</option>
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
            <h3>KhÃ´ng tÃ¬m tháº¥y bÃ i viáº¿t</h3>
            <p>Thá»­ chá»n danh má»¥c khÃ¡c hoáº·c thay Ä‘á»•i tá»« khÃ³a tÃ¬m kiáº¿m</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-lg)' }}
              onClick={() => { setSearchInput(''); navigate({ category: '', search: '', sort: 'newest', page: '1' }); }}
            >
              Xem táº¥t cáº£ bÃ i viáº¿t
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
                    <span className="article-featured__badge"><FiStar /> BÃ i ná»•i báº­t</span>
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
                        <FiEye /> {featuredArticle.views.toLocaleString()} lÆ°á»£t xem
                      </div>
                    )}
                  </div>
                  <span className="article-featured__cta">
                    Äá»c bÃ i viáº¿t <FiArrowRight />
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
                {page > 1 ? (
                  <Link
                    className="articles-pagination__btn"
                    href={articleListingUrl({ ...filtersRef.current, page: String(page - 1) })}
                    onClick={() => syncFilters({ ...filtersRef.current, page: String(page - 1) })}
                    aria-label="Previous page"
                  >
                    <FiChevronLeft /> Previous
                  </Link>
                ) : (
                  <span className="articles-pagination__btn articles-pagination__btn--disabled" aria-disabled="true">
                    <FiChevronLeft /> Previous
                  </span>
                )}
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
                    <Link
                      key={pageNum}
                      className={`articles-pagination__btn ${page === pageNum ? 'articles-pagination__btn--active' : ''}`}
                      href={articleListingUrl({ ...filtersRef.current, page: String(pageNum) })}
                      onClick={() => syncFilters({ ...filtersRef.current, page: String(pageNum) })}
                      aria-current={page === pageNum ? 'page' : undefined}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
                {page < pagination.lastPage ? (
                  <Link
                    className="articles-pagination__btn"
                    href={articleListingUrl({ ...filtersRef.current, page: String(page + 1) })}
                    onClick={() => syncFilters({ ...filtersRef.current, page: String(page + 1) })}
                    aria-label="Next page"
                  >
                    Next <FiChevronRight />
                  </Link>
                ) : (
                  <span className="articles-pagination__btn articles-pagination__btn--disabled" aria-disabled="true">
                    Next <FiChevronRight />
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
