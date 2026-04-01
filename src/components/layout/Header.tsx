'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiSearch, FiShoppingBag, FiMenu, FiX, FiChevronDown } from 'react-icons/fi';
import { RiGlassesLine } from 'react-icons/ri';
import { useSettings } from '@/lib/useSettings';

interface MenuItem {
  id: string | number;
  name: string;
  url: string;
  children?: MenuItem[];
}

interface HeaderProps {
  menus?: MenuItem[];
}

// Chỉ những trang này mới cho phép header transparent khi ở đầu trang
const TRANSPARENT_PAGES = ['/'];

export default function Header({ menus }: HeaderProps) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Header chỉ transparent nếu đang ở trang được phép VÀ chưa scroll
  const allowTransparent = TRANSPARENT_PAGES.includes(pathname);
  const isTransparent = allowTransparent && !isScrolled;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    // Kiểm tra ngay khi mount (tránh trường hợp đã scroll trước khi mount)
    setIsScrolled(window.scrollY > 50);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('glass_cart') || '[]');
        const count = cart.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        setCartCount(count);
      } catch { setCartCount(0); }
    };
    updateCartCount();
    window.addEventListener('cart-updated', updateCartCount);
    window.addEventListener('storage', updateCartCount);
    return () => {
      window.removeEventListener('cart-updated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, []);

  const defaultMenus: MenuItem[] = menus || [
    { id: '1', name: 'Trang Chủ', url: '/' },
    { id: '2', name: 'Sản Phẩm', url: '/san-pham', children: [
      { id: '2-1', name: 'Kính Cận', url: '/san-pham?type=can' },
      { id: '2-2', name: 'Kính Râm', url: '/san-pham?type=ram' },
      { id: '2-3', name: 'Kính Thời Trang', url: '/san-pham?type=thoi-trang' },
      { id: '2-4', name: 'Gọng Kính', url: '/san-pham?type=gong' },
    ]},
    { id: '3', name: 'Thử Kính AI', url: '/thu-kinh-ao' },
    { id: '4', name: 'Bài Viết', url: '/bai-viet' },
    { id: '5', name: 'Liên Hệ', url: '/lien-he' },
  ];

  return (
    <>
      <header className={`header ${isTransparent ? 'header--transparent' : 'header--solid'}`}>
        <div className="header__inner">
          <Link href="/" className="header__logo">
            {settings['site_logo'] ? (
              <img
                src={
                  settings['site_logo'].startsWith('http')
                    ? settings['site_logo']
                    : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${settings['site_logo']}`
                }
                alt={settings['site_name'] || 'GLASS'}
                style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
              />
            ) : (
              <>
                <RiGlassesLine className="header__logo-icon" />
                <span>{settings['site_name'] || 'GLASS'}</span>
              </>
            )}
          </Link>

          <nav className="header__nav">
            {defaultMenus.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              return (
                <div key={item.id} className={hasChildren ? 'header__dropdown' : ''}>
                  <Link href={item.url || '#'} className="header__nav-link">
                    {item.name}
                    {hasChildren && <FiChevronDown style={{ marginLeft: '4px', fontSize: '14px' }} />}
                  </Link>
                  {hasChildren && (
                    <div className="header__dropdown-menu">
                      {item.children!.map((child) => (
                        <Link key={child.id} href={child.url || '#'} className="header__dropdown-item">
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="header__actions">
            <Link href="/tim-kiem" className="header__action-btn" aria-label="Tìm kiếm">
              <FiSearch />
            </Link>
            <Link href="/gio-hang" className="header__action-btn" aria-label="Giỏ hàng" style={{ position: 'relative' }}>
              <FiShoppingBag />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'var(--color-gold)', color: 'var(--color-bg)',
                  fontSize: '0.625rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{cartCount > 99 ? '99+' : cartCount}</span>
              )}
            </Link>
            <button
              className="header__mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: 'rgba(10, 10, 26, 0.98)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '100px 32px 32px',
          animation: 'fadeInUp 0.3s ease',
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {defaultMenus.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              return (
                <div key={item.id}>
                  <Link
                    href={item.url || '#'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      display: 'block',
                      padding: '16px 0',
                      fontSize: '1.5rem',
                      fontFamily: 'var(--font-display)',
                      color: 'var(--color-white)',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {item.name} {hasChildren && <span style={{ fontSize: '1.2rem', marginLeft: '4px' }}>▾</span>}
                  </Link>
                  {hasChildren && (
                    <div style={{ paddingLeft: '24px' }}>
                      {item.children!.map((child) => (
                        <Link
                          key={child.id}
                          href={child.url || '#'}
                          onClick={() => setIsMobileMenuOpen(false)}
                          style={{
                            display: 'block',
                            padding: '10px 0',
                            fontSize: '1rem',
                            color: 'rgba(255,255,255,0.6)',
                          }}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
