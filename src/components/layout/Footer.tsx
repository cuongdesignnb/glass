import Link from 'next/link';
import { FiFacebook, FiInstagram, FiYoutube, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { RiGlassesLine } from 'react-icons/ri';

interface MenuItem {
  id: string | number;
  name: string;
  url: string;
  children?: MenuItem[];
}

export default function Footer({ menus }: { menus?: MenuItem[] }) {
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

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div>
            <div className="footer__brand-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RiGlassesLine />
              GLASS
            </div>
            <p className="footer__brand-desc">
              Cửa hàng kính mắt thời trang cao cấp. Đa dạng kiểu dáng, chất liệu premium.
              Thử kính ảo AI tiên tiến, miễn phí vận chuyển toàn quốc.
            </p>
            <div className="footer__social">
              <a href="#" className="footer__social-link" aria-label="Facebook">
                <FiFacebook />
              </a>
              <a href="#" className="footer__social-link" aria-label="Instagram">
                <FiInstagram />
              </a>
              <a href="#" className="footer__social-link" aria-label="YouTube">
                <FiYoutube />
              </a>
            </div>
          </div>

          {/* Dynamic Menus (Sản Phẩm, Hỗ Trợ, etc.) */}
          {displayMenus.map((block, i) => (
            <div key={block.id || i}>
              <h3 className="footer__title">{block.name}</h3>
              <nav className="footer__links">
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
              <a href="tel:0123456789" className="footer__link">
                <FiPhone style={{ flexShrink: 0 }} /> 0123 456 789
              </a>
              <a href="mailto:info@glass.vn" className="footer__link">
                <FiMail style={{ flexShrink: 0 }} /> info@glass.vn
              </a>
              <span className="footer__link" style={{ cursor: 'default' }}>
                <FiMapPin style={{ flexShrink: 0 }} /> 123 Nguyễn Huệ, Q.1, TP.HCM
              </span>
            </nav>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} Glass Eyewear. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Link href="/chinh-sach-bao-mat" style={{ fontSize: '0.875rem' }}>Chính sách bảo mật</Link>
            <Link href="/dieu-khoan-su-dung" style={{ fontSize: '0.875rem' }}>Điều khoản sử dụng</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
