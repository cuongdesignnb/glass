import { Metadata } from 'next';
import CartClient from './CartClient';

export const metadata: Metadata = {
  title: 'Giỏ Hàng | Glass Eyewear',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return <CartClient />;
}
