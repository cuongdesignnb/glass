'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FiFacebook, FiInstagram, FiYoutube, FiMail, FiPhone, FiMapPin, FiChevronDown, FiClock, FiArrowRight } from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import { RiGlassesLine } from 'react-icons/ri';
import { useSettings } from '@/lib/useSettings';

interface FooterLink {
  label: string;
  url: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const defaultColumns: FooterColumn[] = [
  {
    title: 'Sản Phẩm',
    links: [
      { label: 'Kính Cận', url: '/san-pham?type=can' },
      { label: 'Kính Râm', url: '/san-pham?type=ram' },
      { label: 'Kính Thời Trang', url: '/san-pham?type=thoi-trang' },
      { label: 'Gọng Kính', url: '/san-pham?type=gong' },
      { label: 'Sản Phẩm Nổi Bật', url: '/san-pham?featured=true' },
    ],
  },
  {
    title: 'Hỗ Trợ',
    links: [
      { label: 'Hướng Dẫn Mua Hàng', url: '/huong-dan-mua-hang' },
      { label: 'Chính Sách Đổi Trả', url: '/chinh-sach-doi-tra' },
      { label: 'Chính Sách Bảo Hành', url: '/chinh-sach-bao-hanh' },
      { label: 'Vận Chuyển', url: '/van-chuyen' },
      { label: 'Thử Kính AI', url: '/thu-kinh-ao' },
      { label: 'Tra Cứu Đơn Hàng', url: '/tra-cuu-don-hang' },
    ],
  },
  {
    title: 'Về Chúng Tôi',
    links: [
      { label: 'Giới Thiệu', url: '/gioi-thieu' },
      { label: 'Câu Hỏi Thường Gặp', url: '/faq' },
      { label: 'Bài Viết', url: '/bai-viet' },
      { label: 'Liên Hệ', url: '/lien-he' },
    ],
  },
];

export default function Footer() {
  const { settings } = useSettings();
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  // Parse footer_menus from admin settings (JSON), fallback to defaults
  let columns: FooterColumn[] = defaultColumns;
  try {
    if (settings['footer_menus']) {
      const parsed = JSON.parse(settings['footer_menus']);
      if (Array.isArray(parsed) && parsed.length > 0) {
        columns = parsed;
      }
    }
  } catch {
    // Invalid JSON → use defaults
  }

  // Parse bottom links from admin settings
  let bottomLinks: FooterLink[] = [];
  try {
    if (settings['footer_bottom_links']) {
      const parsed = JSON.parse(settings['footer_bottom_links']);
      if (Array.isArray(parsed)) bottomLinks = parsed;
    }
  } catch { /* use empty */ }
  if (bottomLinks.length === 0) {
    bottomLinks = [
      { label: 'Chính sách bảo mật', url: settings['footer_privacy_url'] || '/chinh-sach-bao-mat' },
      { label: 'Điều khoản sử dụng', url: settings['footer_terms_url'] || '/dieu-khoan-su-dung' },
      { label: 'Chính sách đổi trả', url: '/chinh-sach-doi-tra' },
      { label: 'Chính sách vận chuyển', url: '/van-chuyen' },
    ];
  }

  const siteName = settings['site_name'] || 'Glass Eyewear';
  const showSocial = settings['footer_show_social'] !== '0';
  const showMenus = settings['footer_show_menus'] !== '0';
  const showContact = settings['footer_show_contact'] !== '0';
  const openingHours = settings['footer_opening_hours'] || '';

  const toggleAccordion = (id: string) => {
    setOpenAccordion((prev) => (prev === id ? null : id));
  };

  const hasSocial = !!(settings['social_facebook'] || settings['social_instagram'] || settings['social_youtube'] || settings['social_tiktok']);

  return (
    <footer className="footer">
      {/* Main Footer */}
      <div className="container">
        <div className="footer__grid">
          {/* Brand Column */}
          <div className="footer__brand-col">
            <div className="footer__brand-name">
              <RiGlassesLine />
              {siteName}
            </div>
            <p className="footer__brand-desc">
              {settings['footer_description'] ||
                'Cửa hàng kính mắt thời trang cao cấp. Đa dạng kiểu dáng, chất liệu premium. Thử kính ảo AI tiên tiến, miễn phí vận chuyển toàn quốc.'}
            </p>

            {/* Contact Info — inline in brand col */}
            {showContact && (
              <div className="footer__contact-list">
                {settings['contact_phone'] && (
                  <a href={`tel:${settings['contact_phone']}`} className="footer__contact-item">
                    <FiPhone /> <span>{settings['contact_phone']}</span>
                  </a>
                )}
                {settings['contact_email'] && (
                  <a href={`mailto:${settings['contact_email']}`} className="footer__contact-item">
                    <FiMail /> <span>{settings['contact_email']}</span>
                  </a>
                )}
                {settings['contact_address'] && (
                  <div className="footer__contact-item">
                    <FiMapPin /> <span>{settings['contact_address']}</span>
                  </div>
                )}
                {openingHours && (
                  <div className="footer__contact-item">
                    <FiClock /> <span>{openingHours}</span>
                  </div>
                )}
              </div>
            )}

            {/* Social Icons */}
            {showSocial && (
              <div className="footer__social">
                {settings['social_facebook'] && (
                  <a href={settings['social_facebook']} className="footer__social-link" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                    <FiFacebook />
                  </a>
                )}
                {settings['social_instagram'] && (
                  <a href={settings['social_instagram']} className="footer__social-link" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                    <FiInstagram />
                  </a>
                )}
                {settings['social_youtube'] && (
                  <a href={settings['social_youtube']} className="footer__social-link" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
                    <FiYoutube />
                  </a>
                )}
                {settings['social_tiktok'] && (
                  <a href={settings['social_tiktok']} className="footer__social-link" aria-label="TikTok" target="_blank" rel="noopener noreferrer">
                    <SiTiktok />
                  </a>
                )}
                {/* Fallback */}
                {!hasSocial && (
                  <>
                    <a href="#" className="footer__social-link" aria-label="Facebook"><FiFacebook /></a>
                    <a href="#" className="footer__social-link" aria-label="Instagram"><FiInstagram /></a>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Menu Columns */}
          {showMenus &&
            columns.map((col, i) => (
              <div key={i} className="footer__menu-block">
                <h3
                  className="footer__title"
                  onClick={() => toggleAccordion(`col-${i}`)}
                >
                  {col.title}
                  <FiChevronDown
                    className="footer__accordion-icon"
                    style={{
                      transition: 'transform 0.2s ease',
                      transform: openAccordion === `col-${i}` ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </h3>
                <nav
                  className="footer__links"
                  data-open={openAccordion === `col-${i}` ? 'true' : 'false'}
                >
                  {col.links.map((link, j) => (
                    <Link key={j} href={link.url || '#'} className="footer__link">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
        </div>

        {/* Bottom Bar */}
        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} {siteName}. {settings['footer_copyright'] || 'All rights reserved.'}</p>
          <div className="footer__bottom-links">
            {bottomLinks.map((link, i) => (
              <Link key={i} href={link.url}>{link.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
