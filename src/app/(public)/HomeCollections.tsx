'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, type CSSProperties } from 'react';
import { FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

type HomeCollection = {
  id?: number;
  name: string;
  slug: string;
  description?: string | null;
  tag?: string | null;
  size?: 'normal' | 'tall' | 'wide' | string | null;
  image?: string | null;
  gradient_from?: string | null;
  gradient_to?: string | null;
  accent_color?: string | null;
  products_count?: number | null;
};

type HomeCollectionsProps = {
  collections: HomeCollection[];
  enabled?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaText?: string;
};

function imageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

export default function HomeCollections({
  collections,
  enabled = true,
  eyebrow = 'Phong Cách',
  title = 'Bộ Sưu Tập Theo Phong Cách',
  description = 'Chọn bộ sưu tập phù hợp với cá tính và lối sống của bạn',
  ctaText = 'Khám phá',
}: HomeCollectionsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!enabled || collections.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    const target = scrollRef.current;
    if (!target) return;
    target.scrollBy({
      left: direction === 'left' ? -target.clientWidth * 0.7 : target.clientWidth * 0.7,
      behavior: 'smooth',
    });
  };

  return (
    <section className="section style-collection" aria-labelledby="home-collections-title">
      <div className="container">
        <div className="section__header">
          <span className="section__tag">{eyebrow}</span>
          <h2 id="home-collections-title" className="section__title">{title}</h2>
          <p className="section__subtitle">{description}</p>
        </div>

        <div className="slider-wrap">
          {collections.length > 1 && (
            <button type="button" className="slider-nav slider-nav--prev" onClick={() => scroll('left')} aria-label="Xem bộ sưu tập trước">
              <FiChevronLeft />
            </button>
          )}

          <div className="style-masonry" ref={scrollRef}>
            {collections.map((collection, index) => {
              const backgroundImage = imageUrl(collection.image);
              const count = Number(collection.products_count) || 0;
              const accent = collection.accent_color || '#c9a96e';

              return (
                <Link
                  key={collection.id || collection.slug}
                  href={`/bo-suu-tap/${encodeURIComponent(collection.slug)}`}
                  className={`style-card style-card--${collection.size || 'normal'}`}
                  style={{ '--card-index': index, '--collection-accent': accent } as CSSProperties}
                >
                  {backgroundImage ? (
                    <Image src={backgroundImage} alt={collection.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="style-card__img" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div
                      className="style-card__img style-card__img--placeholder"
                      style={{
                        background: collection.gradient_from && collection.gradient_to
                          ? `linear-gradient(160deg, ${collection.gradient_from} 0%, ${collection.gradient_to} 100%)`
                          : '#e8e0d4',
                      }}
                    />
                  )}

                  <div className="style-card__overlay" />
                  <h3 className="style-card__name">{collection.name}</h3>
                  <div className="style-card__hover-info">
                    {collection.tag && (
                      <span className="style-card__tag" style={{ color: accent, borderColor: `${accent}66`, background: `${accent}22` }}>
                        {collection.tag}
                      </span>
                    )}
                    {collection.description && <p className="style-card__desc">{collection.description}</p>}
                    {count > 0 && <span style={{ display: 'block', marginTop: '4px', color: 'rgba(255,255,255,0.76)', fontSize: '0.78rem' }}>{count} sản phẩm</span>}
                    <span className="style-card__cta">{ctaText} <FiArrowRight /></span>
                  </div>
                </Link>
              );
            })}
          </div>

          {collections.length > 1 && (
            <button type="button" className="slider-nav slider-nav--next" onClick={() => scroll('right')} aria-label="Xem bộ sưu tập tiếp theo">
              <FiChevronRight />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
