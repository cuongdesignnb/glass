import { Metadata } from 'next';
import OrderLookupClient from './OrderLookupClient';

export const metadata: Metadata = {
  title: 'Tra Cứu Đơn Hàng | Glass Eyewear',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrderLookupPage() {
  return <OrderLookupClient />;
}
