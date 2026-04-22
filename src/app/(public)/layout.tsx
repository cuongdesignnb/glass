import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Newsletter from '@/components/layout/Newsletter';
import ChatWidget from '@/components/layout/ChatWidget';
import { CartProvider } from '@/lib/useCart';
import { AuthProvider } from '@/lib/useAuth';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <CartProvider>
        <Header />
        <main>{children}</main>
        <Newsletter />
        <Footer />
        <ChatWidget />
      </CartProvider>
    </AuthProvider>
  );
}
