import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/lib/useCart';

import { publicApi } from '@/lib/api';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let headerMenus = [];
  let footerMenus = [];
  try {
    const [h, f] = await Promise.all([
      publicApi.getMenus('header').catch(() => []),
      publicApi.getMenus('footer').catch(() => [])
    ]);
    headerMenus = h;
    footerMenus = f;
  } catch (e) {}

  return (
    <CartProvider>
      <Header menus={headerMenus.length > 0 ? headerMenus : undefined} />
      <main>{children}</main>
      <Footer menus={footerMenus.length > 0 ? footerMenus : undefined} />
    </CartProvider>
  );
}
