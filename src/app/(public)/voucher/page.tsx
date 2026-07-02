import { Metadata } from 'next';
import VoucherClient from './VoucherClient';

export const metadata: Metadata = {
  title: 'Mã Giảm Giá',
  description: 'Sao chép mã giảm giá và sử dụng khi thanh toán để nhận ưu đãi.',
  alternates: {
    canonical: '/voucher',
  },
};

export default function VoucherPage() {
  return <VoucherClient />;
}
