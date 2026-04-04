'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FiSearch, FiShoppingBag, FiMenu, FiX, FiChevronDown, FiUser, FiBell, FiLogOut, FiShoppingCart, FiStar, FiHome, FiGrid } from 'react-icons/fi';
import { RiGlassesLine } from 'react-icons/ri';
import { useSettings } from '@/lib/useSettings';
import { useAuth } from '@/lib/useAuth';

interface MenuItem {
  id: string | number;
  name: string;
  url: string;
  children?: MenuItem[];
}

interface HeaderProps {
  menus?: MenuItem[];
}

// All pages now use light header
const TRANSPARENT_PAGES = ['/'];

export default function Header({ menus }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const allowTransparent = TRANSPARENT_PAGES.includes(pathname);
  const isTransparent = allowTransparent && !isScrolled;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
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

  // Apply brand color from settings
  useEffect(() => {
    if (settings['brand_color']) {
      document.documentElement.style.setProperty('--color-brand', settings['brand_color']);
      // Generate lighter/darker variants
      const hex = settings['brand_color'];
      document.documentElement.style.setProperty('--color-brand-soft', `${hex}14`);
      document.documentElement.style.setProperty('--color-accent', hex);
      document.documentElement.style.setProperty('--color-accent-light', hex);
    }
  }, [settings]);

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
                style={{ height: '34px', width: 'auto', objectFit: 'contain' }}
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
                    {hasChildren && <FiChevronDown style={{ marginLeft: '4px', fontSize: '12px' }} />}
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
                  position: 'absolute', top: '2px', right: '2px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: 'var(--color-brand)', color: '#fff',
                  fontSize: '0.5625rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{cartCount > 99 ? '99+' : cartCount}</span>
              )}
            </Link>

            {/* User Auth — hidden on mobile, shown in bottom nav */}
            {user ? (
              <div className="header__dropdown" style={{ position: 'relative' }}>
                <button className="header__action-btn" onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', position: 'relative' }}>
                  <FiUser />
                  {(user.unread_notifications || 0) > 0 && (
                    <span style={{
                      position: 'absolute', top: '2px', right: '2px',
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: '#ef4444', color: '#fff',
                      fontSize: '0.5rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{user.unread_notifications}</span>
                  )}
                </button>
                {showUserMenu && (
                  <div className="header__dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '200px', opacity: 1, visibility: 'visible', transform: 'translateX(0) translateY(0)' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-gray-200)', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--color-text-heading)' }}>{user.name}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
                    </div>
                    <Link href="/tai-khoan" className="header__dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <FiUser style={{ marginRight: 8 }} /> Tài khoản
                    </Link>
                    <Link href="/tai-khoan" className="header__dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <FiShoppingCart style={{ marginRight: 8 }} /> Đơn hàng
                    </Link>
                    <Link href="/tai-khoan" className="header__dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <FiStar style={{ marginRight: 8 }} /> Điểm: {user.points || 0}
                    </Link>
                    <Link href="/tai-khoan" className="header__dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <FiBell style={{ marginRight: 8 }} /> Thông báo
                      {(user.unread_notifications || 0) > 0 && (
                        <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: '.6875rem', padding: '1px 6px', borderRadius: '99px' }}>
                          {user.unread_notifications}
                        </span>
                      )}
                    </Link>
                    <button className="header__dropdown-item" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', borderTop: '1px solid var(--color-gray-200)', marginTop: '4px', paddingTop: '8px' }}
                      onClick={() => { logout(); setShowUserMenu(false); router.push('/'); }}>
                      <FiLogOut style={{ marginRight: 8 }} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/dang-nhap" className="header__action-btn" aria-label="Đăng nhập" title="Đăng nhập">
                <FiUser />
              </Link>
            )}

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

      {/* Mobile Menu Overlay — Light theme */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '100px 32px 32px',
          animation: 'fadeInUp 0.3s ease',
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                      fontSize: '1.25rem',
                      fontFamily: 'var(--font-display)',
                      color: 'var(--color-text-heading)',
                      borderBottom: '1px solid var(--color-gray-200)',
                    }}
                  >
                    {item.name} {hasChildren && <span style={{ fontSize: '1rem', marginLeft: '4px', color: 'var(--color-text-muted)' }}>▾</span>}
                  </Link>
                  {hasChildren && (
                    <div style={{ paddingLeft: '20px' }}>
                      {item.children!.map((child) => (
                        <Link
                          key={child.id}
                          href={child.url || '#'}
                          onClick={() => setIsMobileMenuOpen(false)}
                          style={{
                            display: 'block',
                            padding: '10px 0',
                            fontSize: '0.9375rem',
                            color: 'var(--color-text-light)',
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

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav__inner">
          <Link
            href="/"
            className={`mobile-bottom-nav__item ${pathname === '/' ? 'mobile-bottom-nav__item--active' : ''}`}
          >
            <FiHome />
            <span>Trang chủ</span>
          </Link>
          <Link
            href="/san-pham"
            className={`mobile-bottom-nav__item ${pathname.startsWith('/san-pham') ? 'mobile-bottom-nav__item--active' : ''}`}
          >
            <FiGrid />
            <span>Sản phẩm</span>
          </Link>
          <Link
            href="/gio-hang"
            className={`mobile-bottom-nav__item ${pathname === '/gio-hang' ? 'mobile-bottom-nav__item--active' : ''}`}
          >
            <FiShoppingBag />
            <span>Giỏ hàng</span>
            {cartCount > 0 && (
              <span className="mobile-bottom-nav__badge">{cartCount > 99 ? '99+' : cartCount}</span>
            )}
          </Link>
          <Link
            href={user ? '/tai-khoan' : '/dang-nhap'}
            className={`mobile-bottom-nav__item ${pathname.startsWith('/tai-khoan') || pathname === '/dang-nhap' ? 'mobile-bottom-nav__item--active' : ''}`}
          >
            <FiUser />
            <span>{user ? 'Tài khoản' : 'Đăng nhập'}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
