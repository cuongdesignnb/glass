import { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Đăng Nhập | Glass Eyewear',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
