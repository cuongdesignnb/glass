import { Metadata } from 'next';
import AccountClient from './AccountClient';

export const metadata: Metadata = {
  title: 'Tài Khoản | Glass Eyewear',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountPage() {
  return <AccountClient />;
}
