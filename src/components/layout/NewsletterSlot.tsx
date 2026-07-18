'use client';

import { usePathname } from 'next/navigation';
import Newsletter from './Newsletter';
import { shouldRenderLayoutNewsletter } from './newsletter-visibility';

export default function NewsletterSlot() {
  const pathname = usePathname();

  return shouldRenderLayoutNewsletter(pathname) ? <Newsletter /> : null;
}
