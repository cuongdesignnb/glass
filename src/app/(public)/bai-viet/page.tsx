'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { FiSearch, FiArrowRight, FiEye, FiCalendar, FiChevronLeft, FiChevronRight, FiBookOpen, FiFileText, FiMessageSquare, FiTrendingUp, FiTool, FiBook, FiBell, FiStar, FiFile } from 'react-icons/fi';
import './articles.css';

const CATEGORIES = [
  { slug: '', label: 'Tất Cả', icon: <FiFileText /> },
  { slug: 'tu-van', label: 'Tư Vấn Kính', icon: <FiMessageSquare /> },
  { slug: 'xu-huong', label: 'Xu Hướng', icon: <FiTrendingUp /> },
  { slug: 'cham-soc', label: 'Chăm Sóc Kính', icon: <FiTool /> },
  { slug: 'kien-thuc', label: 'Kiến Thức', icon: <FiBook /> },
  { slug: 'tin-tuc', label: 'Tin Tức', icon: <FiBell /> },
  { slug: 'review', label: 'Đánh Giá', icon: <FiStar /> },
];

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

export default function ArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>({});
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        per_page: '9',
        page: String(page),
        sort,
      };
      if (activeCategory) params.tag = activeCategory;
      if (search.trim()) params.search = search.trim();

      const data = await publicApi.getArticles(params);
      setArticles(data.data || []);
      setPagination({
        currentPage: data.current_page || 1,
        lastPage: data.last_page || 1,
        total: data.total || 0,
      });
    } catch (err) {
      console.error('Failed to load articles:', err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search, sort, page]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  // Reset to page 1 on filter change
  const handleCategory = (slug: string) => {
    setActiveCategory(slug);
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  // Featured article = first article with is_featured or just first
  const featuredArticle = articles.find((a) => a.is_featured) || articles[0];
  const gridArticles = featuredArticle
    ? articles.filter((a) => a.id !== featuredArticle.id)
    : articles;

  return (
    <div>
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
            {CATEGORIES.map((cat) => (
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
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="articles-toolbar__right">
            <span className="articles-toolbar__count">
              {loading ? '...' : `${pagination.total || 0} bài viết`}
            </span>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
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
              onClick={() => { setSearch(''); handleCategory(''); }}
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
                    <img src={buildImageUrl(featuredArticle.thumbnail)} alt={featuredArticle.title} />
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
                      {CATEGORIES.find(c => c.slug === featuredArticle.tags[0])?.icon || <FiFileText />}
                      {CATEGORIES.find(c => c.slug === featuredArticle.tags[0])?.label || featuredArticle.tags[0]}
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
                        <img src={buildImageUrl(article.thumbnail)} alt={article.title} />
                      ) : (
                        <div className="article-card__image-placeholder"><FiFileText /></div>
                      )}
                      {article.tags?.[0] && (
                        <span className="article-card__tag">
                          {CATEGORIES.find(c => c.slug === article.tags[0])?.label || article.tags[0]}
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
                  onClick={() => setPage(p => p - 1)}
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
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="articles-pagination__btn"
                  disabled={page === pagination.lastPage}
                  onClick={() => setPage(p => p + 1)}
                >
                  Sau <FiChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
