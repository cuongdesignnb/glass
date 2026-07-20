import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterSlot from '@/components/layout/NewsletterSlot';
import ChatWidget from '@/components/layout/ChatWidget';
import { CartProvider } from '@/lib/useCart';
import { AuthProvider } from '@/lib/useAuth';
import { publicApi } from '@/lib/api';
import { SettingsProvider } from '@/lib/useSettings';
import { flattenSettings } from '@/lib/settingsUtils';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settingsRes, menusRes] = await Promise.all([
    publicApi.getSettings().catch(() => ({})),
    publicApi.getMenus('header').catch(() => []),
  ]);

  const settings = flattenSettings(settingsRes);
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
