import { Metadata } from 'next';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  title: 'Đăng Ký Tài Khoản | Glass Eyewear',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
