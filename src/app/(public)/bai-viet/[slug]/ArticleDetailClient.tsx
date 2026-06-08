'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiArrowLeft, FiCalendar, FiEye, FiShare2, FiFacebook,
  FiTwitter, FiLink, FiArrowRight, FiBookOpen,
  FiFileText, FiMessageSquare, FiTrendingUp, FiTool, FiBook, FiBell, FiStar,
} from 'react-icons/fi';

const CATEGORY_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  'tu-van':    { label: 'Tư Vấn Kính',  icon: <FiMessageSquare /> },
  'xu-huong':  { label: 'Xu Hướng',     icon: <FiTrendingUp /> },
  'cham-soc':  { label: 'Chăm Sóc',     icon: <FiTool /> },
  'kien-thuc': { label: 'Kiến Thức',    icon: <FiBook /> },
  'tin-tuc':   { label: 'Tin Tức',      icon: <FiBell /> },
  'review':    { label: 'Đánh Giá',     icon: <FiStar /> },
};

function formatDateVi(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
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

// Extract headings from pre-processed HTML for TOC (client-side only)
function extractHeadingsFromDOM(): { id: string; text: string; level: number }[] {
  if (typeof window === 'undefined') return [];
  const headings: { id: string; text: string; level: number }[] = [];
  document.querySelectorAll('.article-content h2[id], .article-content h3[id]').forEach((el) => {
    headings.push({
      id: el.id,
      text: el.textContent || '',
      level: parseInt(el.tagName[1]),
    });
  });
  return headings;
}

interface ArticleDetailClientProps {
  article: any;
  related: any[];
  processedContent: string;
}

export default function ArticleDetailClient({ article, related, processedContent }: ArticleDetailClientProps) {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Extract headings after DOM has rendered the content
    const timer = setTimeout(() => {
      setHeadings(extractHeadingsFromDOM());
    }, 100);
    return () => clearTimeout(timer);
  }, [processedContent]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mainTag = article.tags?.[0];
  const catInfo = mainTag ? CATEGORY_MAP[mainTag] : null;

  return (
    <div className="article-detail">
      {/* Hero */}
      <div className="article-hero">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="article-hero__breadcrumb">
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <Link href="/bai-viet">Bài viết</Link>
            {catInfo && (
              <>
                <span>/</span>
                <Link href={`/bai-viet?tag=${mainTag}`}>{catInfo.label}</Link>
              </>
            )}
            <span>/</span>
            <strong>{article.title?.slice(0, 40)}{article.title?.length > 40 ? '…' : ''}</strong>
          </nav>

          {/* Tags */}
          {article.tags?.length > 0 && (
            <div className="article-hero__tags">
              {article.tags.map((tag: string) => {
                const info = CATEGORY_MAP[tag];
                return (
                  <Link key={tag} href={`/bai-viet?tag=${tag}`} className="article-hero__tag">
                    {info ? <>{info.icon} {info.label}</> : tag}
                  </Link>
                );
              })}
            </div>
          )}

          <h1 className="article-hero__title">{article.title}</h1>

          {/* Meta */}
          <div className="article-hero__meta">
            <div className="article-hero__author">
              <div className="article-hero__avatar">{getInitials(article.author || 'Glass')}</div>
              <div>
                <div className="article-hero__author-name">{article.author || 'Glass Team'}</div>
                <div className="article-hero__author-role">Chuyên gia kính mắt</div>
              </div>
            </div>
            <div className="article-hero__info">
              <span className="article-hero__info-item">
                <FiCalendar /> {formatDateVi(article.published_at || article.created_at)}
              </span>
              {article.views > 0 && (
                <span className="article-hero__info-item">
                  <FiEye /> {article.views.toLocaleString()} lượt xem
                </span>
              )}
              {article.reading_time && (
                <span className="article-hero__info-item">
                  <FiBookOpen /> {article.reading_time} phút đọc
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail */}
      {article.thumbnail && (
        <div className="article-thumbnail">
          <Image
            src={buildImageUrl(article.thumbnail)}
            alt={article.title}
            width={1200}
            height={675}
            priority
            style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius-xl)' }}
          />
        </div>
      )}

      {/* Body */}
      <div className="article-body">
        {/* Main Content */}
        <div>
          <article className="article-content">
            <div dangerouslySetInnerHTML={{ __html: processedContent }} />

            {/* Tags */}
            {article.tags?.length > 0 && (
              <div className="article-content-tags">
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', fontWeight: 600, marginRight: '4px' }}>
                  Tags:
                </span>
                {article.tags.map((tag: string) => {
                  const info = CATEGORY_MAP[tag];
                  return (
                    <Link key={tag} href={`/bai-viet?tag=${tag}`} className="article-content-tag">
                      {info ? <>{info.icon} {info.label}</> : `#${tag}`}
                    </Link>
                  );
                })}
              </div>
            )}
          </article>

          {/* Share */}
          <div className="article-share">
            <span className="article-share__label"><FiShare2 /> Chia sẻ bài viết:</span>
            <div className="article-share__btns">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="article-share__btn"
                title="Chia sẻ Facebook"
              >
                <FiFacebook />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="article-share__btn"
                title="Chia sẻ Twitter"
              >
                <FiTwitter />
              </a>
              <button className="article-share__btn" onClick={handleCopyLink} title="Sao chép link">
                <FiLink />
              </button>
              {copied && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-rose)', fontWeight: 600 }}>
                  Đã sao chép!
                </span>
              )}
            </div>
          </div>

          {/* Nav prev/next */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xl)' }}>
            <Link href="/bai-viet" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: '1.5px solid var(--color-gray-200)', borderRadius: 'var(--radius-lg)', color: 'var(--color-gray-700)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
              <FiArrowLeft /> Tất cả bài viết
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="article-sidebar">
          {/* Table of Contents */}
          {headings.length > 0 && (
            <div className="article-sidebar-card">
              <div className="article-sidebar-card__title">Mục lục</div>
              <nav className="article-toc">
                {headings.map((h) => (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    className={`article-toc-item ${h.level === 3 ? 'article-toc-item--h3' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    {h.level === 3 ? '↳ ' : ''}{h.text}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Danh mục */}
          <div className="article-sidebar-card">
            <div className="article-sidebar-card__title">Danh Mục</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(CATEGORY_MAP).map(([slug, info]) => (
                <Link
                  key={slug}
                  href={`/bai-viet?tag=${slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    color: mainTag === slug ? 'var(--color-rose)' : 'var(--color-gray-700)',
                    background: mainTag === slug ? 'rgba(212,86,122,0.06)' : 'transparent',
                    fontWeight: mainTag === slug ? 600 : 400,
                    fontSize: '0.875rem',
                    transition: 'all 0.2s',
                  }}
                  className="article-toc-item"
                >
                  <span>{info.icon} {info.label}</span>
                  <FiArrowRight style={{ opacity: 0.4, fontSize: '0.75rem' }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Related Articles */}
          {related.length > 0 && (
            <div className="article-sidebar-card">
              <div className="article-sidebar-card__title">Bài Viết Liên Quan</div>
              <div>
                {related.map((rel: any) => (
                  <Link key={rel.id} href={`/bai-viet/${rel.slug}`} className="article-related-card">
                    <div className="article-related-card__img">
                      {rel.thumbnail ? (
                        <Image
                          src={buildImageUrl(rel.thumbnail)}
                          alt={rel.title}
                          width={68}
                          height={52}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(212,86,122,0.1), rgba(10,10,26,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}><FiFileText /></div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="article-related-card__title">{rel.title}</div>
                      <div className="article-related-card__date">{formatDateVi(rel.published_at || rel.created_at)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Related Articles Bottom */}
      {related.length > 0 && (
        <div className="article-related-section">
          <h2 className="article-related-section__title">Bài Viết Liên Quan</h2>
          <div className="article-related-grid">
            {related.map((rel: any) => (
              <Link key={rel.id} href={`/bai-viet/${rel.slug}`} className="article-card">
                <div className="article-card__image">
                  {rel.thumbnail ? (
                    <Image
                      src={buildImageUrl(rel.thumbnail)}
                      alt={rel.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 360px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="article-card__image-placeholder"><FiFileText /></div>
                  )}
                  {rel.tags?.[0] && (
                    <span className="article-card__tag">
                      {CATEGORY_MAP[rel.tags[0]]?.label || rel.tags[0]}
                    </span>
                  )}
                </div>
                <div className="article-card__body">
                  <h3 className="article-card__title">{rel.title}</h3>
                  {rel.excerpt && <p className="article-card__excerpt">{rel.excerpt}</p>}
                  <div className="article-card__footer">
                    <div className="article-card__meta">
                      <div className="article-card__author-avatar">{getInitials(rel.author || 'G')}</div>
                      <div>
                        <div className="article-card__author-name">{rel.author || 'Glass Team'}</div>
                        <div className="article-card__date">{formatDateVi(rel.published_at || rel.created_at)}</div>
                      </div>
                    </div>
                    {rel.views > 0 && (
                      <div className="article-card__stats">
                        <span className="article-card__stat"><FiEye /> {rel.views.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
