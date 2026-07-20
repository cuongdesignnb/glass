import Image from 'next/image';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

function imageUrl(path: string | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

export default function HomeHero({ settings }: { settings: Record<string, string> }) {
  const heroTitle = settings.hero_title || 'Phong Cách Đẳng Cấp\nQua Mỗi Ánh Nhìn';
  const heroDesc = settings.hero_subtitle || 'Khám phá bộ sưu tập kính mắt cao cấp với công nghệ AI thử kính ảo. Tìm kiếm chiếc kính hoàn hảo cho phong cách riêng của bạn.';
  const heroCtaText = settings.hero_cta_text || 'Khám Phá Ngay';
  const heroTag = settings.hero_tag || 'Bộ Sưu Tập Mới 2026';
  const heroImage = imageUrl(settings.hero_image);
  const heroMobileImage = imageUrl(settings.hero_image_mobile);
  const heroOverlay = settings.hero_overlay || 'left-dark';
  const titleParts = heroTitle.split('\n');

  const overlayGradients: Record<string, string> = {
    'left-dark': 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.05) 70%, transparent 100%)',
    'left-light': 'linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.05) 70%, transparent 100%)',
    'full-dark': 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%)',
    'full-light': 'linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 100%)',
    none: 'none',
  };

  const hasImage = Boolean(heroImage);
  const isDarkOverlay = heroOverlay.includes('dark');
  const overlayBg = hasImage ? overlayGradients[heroOverlay] || overlayGradients['left-dark'] : 'none';
  const titleColor = settings.hero_text_color || (hasImage && isDarkOverlay ? '#ffffff' : 'var(--color-text-heading)');
  const descColor = settings.hero_desc_color || (hasImage && isDarkOverlay ? 'rgba(255,255,255,0.85)' : 'var(--color-text-light)');
  const textShadow = hasImage
    ? isDarkOverlay
      ? '0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)'
      : '0 1px 6px rgba(255,255,255,0.6)'
    : 'none';

  return (
    <section className="hero">
      <div className="hero__bg">
        {heroImage && (
          <>
            {heroMobileImage ? (
              <picture>
                <source media="(max-width: 768px)" srcSet={heroMobileImage} />
                <source media="(min-width: 769px)" srcSet={heroImage} />
                {/* A responsive picture is needed because the two admin images are independent assets. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  className="hero__bg-img"
                />
              </picture>
            ) : (
              <Image
                src={heroImage}
                alt=""
                fill
                priority
                sizes="100vw"
                className="hero__bg-img"
              />
            )}
            <div className="hero__overlay" style={{ background: overlayBg }} />
          </>
        )}
        <div className="hero__bg-gradient" />
        {!hasImage && (
          <div className="hero__particles" aria-hidden="true">
            {Array.from({ length: 15 }, (_, index) => (
              <div
                key={index}
                className="hero__particle"
                style={{
                  left: `${(index * 7.3) % 100}%`,
                  top: `${(index * 13.7) % 100}%`,
                  animationDelay: `${index * 0.5}s`,
                  animationDuration: `${6 + (index % 4)}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="container hero__container">
        <div className="hero__content">
          <div
            className="hero__tag"
            style={hasImage && isDarkOverlay ? { background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)', color: '#fff' } : undefined}
          >
            ✦ {heroTag}
          </div>
          <h1 className="hero__title" style={{ color: titleColor, textShadow }}>
            {titleParts.length > 1 ? <>{titleParts[0]}<br />{titleParts.slice(1).join(' ')}</> : heroTitle}
          </h1>
          <p className="hero__desc" style={{ color: descColor, textShadow }}>{heroDesc}</p>
          <div className="hero__actions">
            <Link href="/san-pham" className="btn btn-primary btn-lg">{heroCtaText} <FiArrowRight /></Link>
            <Link
              href="/thu-kinh-ao"
              className="btn btn-secondary btn-lg"
              style={hasImage && isDarkOverlay ? { borderColor: 'rgba(255,255,255,0.4)', color: '#fff' } : undefined}
            >
              Thử Kính AI
            </Link>
          </div>
        </div>
        <div className="hero__visual" aria-hidden="true">
          <div className="hero__visual-ring hero__visual-ring--lg" />
          <div className="hero__visual-ring hero__visual-ring--md" />
          <div className="hero__visual-ring hero__visual-ring--sm" />
          <div className="hero__visual-badge hero__visual-badge--1"><span className="hero__visual-badge-num">500+</span><span className="hero__visual-badge-txt">Mẫu Kính</span></div>
          <div className="hero__visual-badge hero__visual-badge--2"><span className="hero__visual-badge-num">4.9★</span><span className="hero__visual-badge-txt">Đánh Giá</span></div>
          <div className="hero__visual-center">
            <div className="hero__glasses-shape">
              <div className="hero__glasses-lens hero__glasses-lens--left" />
              <div className="hero__glasses-bridge" />
              <div className="hero__glasses-lens hero__glasses-lens--right" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
