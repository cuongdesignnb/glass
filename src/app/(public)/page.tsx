import React from 'react';
import Link from 'next/link';
import { FiArrowRight, FiTruck, FiShield, FiRefreshCw, FiAward, FiEye, FiCamera, FiPhone, FiCircle, FiSquare, FiHeart, FiMaximize } from 'react-icons/fi';
import { RiGlassesLine, RiSunLine, RiVipCrownLine, RiPriceTag3Line } from 'react-icons/ri';
import { publicApi } from '@/lib/api';
import { DynamicCategories, DynamicProducts, DynamicCollections, DynamicVouchers } from './HomeClient';
import './home.css';

export const metadata = {
  title: 'Glass Eyewear - Kính Mắt Thời Trang Cao Cấp',
  description: 'Cửa hàng kính mắt thời trang cao cấp - Đa dạng kiểu dáng, chất liệu premium. Thử kính ảo AI tiên tiến.',
};

const faceShapes = [
  { shape: 'Oval', icon: <FiCircle style={{ transform: 'scaleX(0.7)' }} />, desc: 'Hợp với hầu hết mọi kiểu', param: 'oval', recommended: 'Rectangle, Browline' },
  { shape: 'Tròn', icon: <FiCircle />, desc: 'Nên chọn gọng góc cạnh', param: 'tron', recommended: 'Rectangle, Square' },
  { shape: 'Vuông', icon: <FiSquare />, desc: 'Nên chọn gọng tròn mềm', param: 'vuong', recommended: 'Oval, Round, Cat-eye' },
  { shape: 'Tim', icon: <FiHeart />, desc: 'Gọng browline hoặc aviator', param: 'tim', recommended: 'Aviator, Browline' },
  { shape: 'Dài', icon: <FiMaximize />, desc: 'Gọng bo tròn, overlay', param: 'dai', recommended: 'Oval, Cat-eye' },
];


const services = [
  { icon: <FiEye />, title: 'Đo Mắt Miễn Phí', desc: 'Đo mắt chuẩn y khoa với thiết bị hiện đại, hoàn toàn miễn phí khi mua kính tại cửa hàng.' },
  { icon: <FiCamera />, title: 'Cắt Tròng Kính', desc: 'Cắt kính chuyên nghiệp ngay tại cửa hàng, thường hoàn thành trong 30–60 phút.' },
  { icon: <FiPhone />, title: 'Tư Vấn 1:1', desc: 'Đội ngũ chuyên viên sẵn sàng tư vấn kiểu dáng, tông màu phù hợp với khuôn mặt bạn.' },
];

const testimonials = [
  { name: 'Nguyễn Thu Hà', avatar: 'NH', rating: 5, text: 'Mình đã thử rất nhiều cửa hàng kính nhưng Glass là nơi duy nhất mình hài lòng từ chất lượng tới dịch vụ. Nhân viên rất tận tình!', since: 'Khách hàng 2 năm' },
  { name: 'Trần Minh Đức', avatar: 'TM', rating: 5, text: 'Tính năng thử kính AI thực sự tiện lợi, mình chọn được chiếc kính ưng ý mà không cần tới cửa hàng. Giao hàng nhanh và đóng gói kỹ.', since: 'Mua online 3 lần' },
  { name: 'Lê Phương Linh', avatar: 'LP', rating: 5, text: 'Chất lượng gọng kính rất tốt, đã dùng được 1 năm không hề bị ố màu hay biến dạng. Giá cả hợp lý so với chất lượng.', since: 'Khách hàng thân thiết' },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__bg">
          <div className="hero__bg-gradient" />
          <div className="hero__particles">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="hero__particle" style={{
                left: `${(i * 7.3) % 100}%`, top: `${(i * 13.7) % 100}%`,
                animationDelay: `${i * 0.5}s`, animationDuration: `${6 + (i % 4)}s`,
              }} />
            ))}
          </div>
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-3xl)', minHeight: '100vh' }}>
          <div className="hero__content">
            <div className="hero__tag">✦ Bộ Sưu Tập Mới 2026</div>
            <h1 className="hero__title">Phong Cách <em>Đẳng Cấp</em><br />Qua Mỗi Ánh Nhìn</h1>
            <p className="hero__desc">Khám phá bộ sưu tập kính mắt cao cấp với công nghệ AI thử kính ảo. Tìm kiếm chiếc kính hoàn hảo cho phong cách riêng của bạn.</p>
            <div className="hero__actions">
              <Link href="/san-pham" className="btn btn-primary btn-lg">Khám Phá Ngay <FiArrowRight /></Link>
              <Link href="/thu-kinh-ao" className="btn btn-secondary btn-lg">Thử Kính AI</Link>
            </div>
          </div>
          <div className="hero__visual">
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

      {/* Trust Badges */}
      <section className="trust-badges">
        <div className="container">
          <div className="trust-badges__grid">
            <div className="trust-badge"><div className="trust-badge__icon"><FiTruck /></div><div><div className="trust-badge__title">Miễn Phí Vận Chuyển</div><div className="trust-badge__desc">Đơn hàng từ 500.000đ</div></div></div>
            <div className="trust-badge"><div className="trust-badge__icon"><FiShield /></div><div><div className="trust-badge__title">Bảo Hành 12 Tháng</div><div className="trust-badge__desc">Đổi mới nếu lỗi sản xuất</div></div></div>
            <div className="trust-badge"><div className="trust-badge__icon"><FiRefreshCw /></div><div><div className="trust-badge__title">Đổi Trả 30 Ngày</div><div className="trust-badge__desc">Không cần lý do</div></div></div>
            <div className="trust-badge"><div className="trust-badge__icon"><FiAward /></div><div><div className="trust-badge__title">Chất Lượng Premium</div><div className="trust-badge__desc">100% chính hãng</div></div></div>
          </div>
        </div>
      </section>

      {/* Categories - Client Side */}
      <section className="section">
        <div className="container">
          <div className="section__header">
            <span className="section__tag">Danh Mục</span>
            <h2 className="section__title">Khám Phá Bộ Sưu Tập</h2>
            <p className="section__subtitle">Tìm kiếm kiểu kính phù hợp với phong cách và nhu cầu của bạn</p>
          </div>
          <DynamicCategories />
        </div>
      </section>

      {/* Featured Products - Client Side */}
      <section className="section" style={{ background: 'var(--color-bg-warm)' }}>
        <div className="container">
          <div className="section__header">
            <span className="section__tag">Nổi Bật</span>
            <h2 className="section__title">Sản Phẩm Được Yêu Thích</h2>
            <p className="section__subtitle">Những mẫu kính được khách hàng yêu thích và đánh giá cao nhất</p>
          </div>
          <DynamicProducts />
          <div style={{ textAlign: 'center', marginTop: 'var(--space-3xl)' }}>
            <Link href="/san-pham" className="btn btn-secondary btn-lg">Xem Tất Cả Sản Phẩm <FiArrowRight /></Link>
          </div>
        </div>
      </section>

      {/* Style Collections — Masonry Grid (Dynamic from API) */}
      <section className="section style-collection">
        <div className="container">
          <div className="section__header">
            <span className="section__tag">Phong Cách</span>
            <h2 className="section__title">Bộ Sưu Tập Theo Phong Cách</h2>
            <p className="section__subtitle">Chọn bộ sưu tập phù hợp với cá tính và lối sống của bạn</p>
          </div>
          <DynamicCollections />
        </div>
      </section>

      {/* Voucher Slider */}
      <section className="section voucher-home-section">
        <div className="container">
          <div className="section__header">
            <span className="section__tag">Ưu Đãi</span>
            <h2 className="section__title">Mã Giảm Giá Dành Cho Bạn</h2>
            <p className="section__subtitle">Sao chép mã và sử dụng khi thanh toán</p>
          </div>
          <DynamicVouchers />
        </div>
      </section>

      {/* AI Try-on CTA */}
      <section className="ai-cta-section">
        <div className="container">
          <div className="ai-cta">
            <div className="ai-cta__content">
              <span className="section__tag">Công Nghệ AI</span>
              <h2 className="heading-lg" style={{ color: 'var(--color-text-heading)', marginBottom: 'var(--space-lg)' }}>Thử Kính Ảo Với <span className="text-gradient">Trí Tuệ Nhân Tạo</span></h2>
              <p style={{ color: 'var(--color-text-light)', fontSize: '1.0625rem', lineHeight: '1.8', marginBottom: 'var(--space-2xl)', maxWidth: '520px' }}>
                Chỉ cần bật camera hoặc upload ảnh, AI sẽ giúp bạn thử hàng trăm mẫu kính mà không cần đến cửa hàng.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <Link href="/thu-kinh-ao" className="btn btn-primary btn-lg">Thử Ngay Miễn Phí <FiArrowRight /></Link>
                <Link href="/thu-kinh-ao?mode=camera" className="btn btn-secondary btn-lg"><FiCamera /> Mở Camera</Link>
              </div>
            </div>
            <div className="ai-cta__visual">
              <div className="ai-cta__orb" />
              <div className="ai-cta__screen">
                <div className="ai-cta__screen-face">
                  <div className="ai-face-circle" />
                  <div className="ai-face-glasses"><div className="ai-face-lens ai-face-lens--l" /><div className="ai-face-bridge" /><div className="ai-face-lens ai-face-lens--r" /></div>
                </div>
                <div className="ai-cta__scan-line" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Face Shape Finder */}
      <section className="section face-shape-section">
        <div className="container">
          <div className="section__header">
            <span className="section__tag">Gợi Ý Thông Minh</span>
            <h2 className="section__title">Chọn Kính Theo Khuôn Mặt</h2>
            <p className="section__subtitle">Chọn hình dạng khuôn mặt để nhận gợi ý kiểu kính phù hợp nhất</p>
          </div>
          <div className="face-shape-grid">
            {faceShapes.map((f) => (
              <Link key={f.param} href={`/san-pham?face=${f.param}`} className="face-shape-card">
                <div className="face-shape-card__icon">{f.icon}</div>
                <h3 className="face-shape-card__name">Mặt {f.shape}</h3>
                <p className="face-shape-card__desc">{f.desc}</p>
                <div className="face-shape-card__rec"><span>Phù hợp:</span> {f.recommended}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section section--dark services-section">
        <div className="container">
          <div className="section__header">
            <span className="section__tag">Dịch Vụ</span>
            <h2 className="section__title">Dịch Vụ Tại Cửa Hàng</h2>
            <p className="section__subtitle">Chúng tôi cung cấp trọn gói dịch vụ chăm sóc mắt và kính mắt chuyên nghiệp</p>
          </div>
          <div className="services-grid">
            {services.map((svc, i) => (
              <div key={i} className="service-card">
                <div className="service-card__icon">{svc.icon}</div>
                <h3 className="service-card__title">{svc.title}</h3>
                <p className="service-card__desc">{svc.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-3xl)' }}>
            <Link href="/lien-he" className="btn btn-primary btn-lg">Đặt Lịch Tư Vấn <FiArrowRight /></Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section testimonials-section">
        <div className="container">
          <div className="section__header">
            <span className="section__tag">Đánh Giá</span>
            <h2 className="section__title">Khách Hàng Nói Gì?</h2>
            <p className="section__subtitle">Hơn 10,000 khách hàng đã tin tưởng và yêu thích sản phẩm của chúng tôi</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-card__stars">{'★'.repeat(t.rating)}</div>
                <p className="testimonial-card__text">"{t.text}"</p>
                <div className="testimonial-card__author">
                  <div className="testimonial-card__avatar">{t.avatar}</div>
                  <div><div className="testimonial-card__name">{t.name}</div><div className="testimonial-card__since">{t.since}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section section--dark stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat"><div className="stat__number">10,000+</div><div className="stat__label">Khách Hàng Hài Lòng</div></div>
            <div className="stat"><div className="stat__number">500+</div><div className="stat__label">Mẫu Kính Đa Dạng</div></div>
            <div className="stat"><div className="stat__number">50+</div><div className="stat__label">Thương Hiệu Premium</div></div>
            <div className="stat"><div className="stat__number">4.9 ★</div><div className="stat__label">Đánh Giá Trung Bình</div></div>
          </div>
        </div>
      </section>
    </>
  );
}
