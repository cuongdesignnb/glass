import { Metadata } from 'next';
import VirtualTryOnClient from './VirtualTryOnClient';

export const metadata: Metadata = {
  title: 'Thử Kính Ảo AI',
  description: 'Trải nghiệm đeo thử kính ngay tại nhà với công nghệ AI tiên tiến.',
  alternates: {
    canonical: '/thu-kinh-ao',
  },
};

export default function VirtualTryOnPage() {
  return <VirtualTryOnClient />;
}
