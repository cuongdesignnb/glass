import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterSlot from '@/components/layout/NewsletterSlot';
import ChatWidget from '@/components/layout/ChatWidget';
import { CartProvider } from '@/lib/useCart';
import { AuthProvider } from '@/lib/useAuth';
import { publicApi } from '@/lib/api';
import { getPublicSettings } from '@/lib/settings';
import { SettingsProvider } from '@/lib/useSettings';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, menusRes] = await Promise.all([
    getPublicSettings(),
    publicApi.getMenus('header').catch(() => []),
  ]);

  const menus = Array.isArray(menusRes) ? menusRes : [];

  return (
    <SettingsProvider initialSettings={settings} initialMenus={menus}>
      <AuthProvider>
        <CartProvider>
          <Header menus={menus} />
          <main>{children}</main>
          <NewsletterSlot />
          <Footer />
          <ChatWidget />
        </CartProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
