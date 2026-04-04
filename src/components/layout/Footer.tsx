'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FiFacebook, FiInstagram, FiYoutube, FiMail, FiPhone, FiMapPin, FiChevronDown } from 'react-icons/fi';
import { RiGlassesLine } from 'react-icons/ri';
import { useSettings } from '@/lib/useSettings';

interface MenuItem {
  id: string | number;
  name: string;
  url: string;
  children?: MenuItem[];
}

export default function Footer({ menus }: { menus?: MenuItem[] }) {
  const { settings } = useSettings();
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const defaultMenus: MenuItem[] = [
    { id: 'f1', name: 'Sản Phẩm', url: '', children: [
      { id: 'f1-1', name: 'Kính Cận', url: '/san-pham?type=can' },
      { id: 'f1-2', name: 'Kính Râm', url: '/san-pham?type=ram' },
      { id: 'f1-3', name: 'Kính Thời Trang', url: '/san-pham?type=thoi-trang' },
      { id: 'f1-4', name: 'Gọng Kính', url: '/san-pham?type=gong' },
      { id: 'f1-5', name: 'Sản Phẩm Nổi Bật', url: '/san-pham?featured=true' }
    ] },
    { id: 'f2', name: 'Hỗ Trợ', url: '', children: [
      { id: 'f2-1', name: 'Hướng Dẫn Mua Hàng', url: '/huong-dan-mua-hang' },
      { id: 'f2-2', name: 'Chính Sách Đổi Trả', url: '/chinh-sach-doi-tra' },
      { id: 'f2-3', name: 'Chính Sách Bảo Hành', url: '/chinh-sach-bao-hanh' },
      { id: 'f2-4', name: 'Vận Chuyển', url: '/van-chuyen' },
      { id: 'f2-5', name: 'Thử Kính AI', url: '/thu-kinh-ao' }
    ] }
  ];

  const displayMenus = menus && menus.length > 0 ? menus : defaultMenus;
  const siteName = settings['site_name'] || 'Glass Eyewear';

  const toggleAccordion = (id: string) => {
    setOpenAccordion(prev => prev === id ? null : id);
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div>
            <div className="footer__brand-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RiGlassesLine />
              {siteName}
            </div>
            <p className="footer__brand-desc">
              Cửa hàng kính mắt thời trang cao cấp. Đa dạng kiểu dáng, chất liệu premium.
              Thử kính ảo AI tiên tiến, miễn phí vận chuyển toàn quốc.
            </p>
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
              {/* Fallback if no social links configured */}
              {!settings['social_facebook'] && !settings['social_instagram'] && !settings['social_youtube'] && (
                <>
                  <a href="#" className="footer__social-link" aria-label="Facebook"><FiFacebook /></a>
                  <a href="#" className="footer__social-link" aria-label="Instagram"><FiInstagram /></a>
                  <a href="#" className="footer__social-link" aria-label="YouTube"><FiYoutube /></a>
                </>
              )}
            </div>
          </div>

          {/* Dynamic Menus — Desktop: normal, Mobile: accordion */}
          {displayMenus.map((block, i) => (
            <div key={block.id || i} className="footer__menu-block">
              <h3
                className="footer__title"
                onClick={() => toggleAccordion(String(block.id))}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                {block.name}
                <FiChevronDown
                  className="footer__accordion-icon"
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: openAccordion === String(block.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </h3>
              <nav
                className="footer__links"
                style={{
                  maxHeight: openAccordion === String(block.id) ? '300px' : undefined,
                }}
                data-open={openAccordion === String(block.id) ? 'true' : 'false'}
              >
                {block.children?.map((item: any, j: number) => (
                  <Link key={item.id || j} href={item.url || '#'} className="footer__link">{item.name}</Link>
                ))}
              </nav>
            </div>
          ))}

          {/* Contact */}
          <div>
            <h3 className="footer__title">Liên Hệ</h3>
            <nav className="footer__links">
              <a href={`tel:${settings['contact_phone'] || '0123456789'}`} className="footer__link">
                <FiPhone style={{ flexShrink: 0 }} /> {settings['contact_phone'] || '0123 456 789'}
              </a>
              <a href={`mailto:${settings['contact_email'] || 'info@glass.vn'}`} className="footer__link">
                <FiMail style={{ flexShrink: 0 }} /> {settings['contact_email'] || 'info@glass.vn'}
              </a>
              <span className="footer__link" style={{ cursor: 'default' }}>
                <FiMapPin style={{ flexShrink: 0 }} /> {settings['contact_address'] || '123 Nguyễn Huệ, Q.1, TP.HCM'}
              </span>
            </nav>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Link href="/chinh-sach-bao-mat" style={{ fontSize: '0.8125rem' }}>Chính sách bảo mật</Link>
            <Link href="/dieu-khoan-su-dung" style={{ fontSize: '0.8125rem' }}>Điều khoản sử dụng</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
