import { Metadata } from 'next';
import { FiClock, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { getPublicSettings } from '@/lib/settings';
import { generateBreadcrumbSchema, generateMeta } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const siteName = settings['site_name']?.trim() || 'MITOO';

  return generateMeta({
    title: `Liên hệ ${siteName} | Tư vấn kính mắt`,
    description: `Thông tin liên hệ ${siteName}, gồm số điện thoại, email, địa chỉ và giờ hoạt động khi có dữ liệu công khai.`,
    url: '/lien-he',
  });
}

export default async function ContactPage() {
  const settings = await getPublicSettings();
  const siteName = settings['site_name']?.trim() || 'MITOO';
  const phone = settings['contact_phone']?.trim() || '';
  const email = settings['contact_email']?.trim() || '';
  const address = settings['contact_address']?.trim() || '';
  const openingHours = settings['footer_opening_hours']?.trim() || '';
  const heading = siteName === 'MITOO' ? 'Liên hệ MITOO' : `Liên hệ ${siteName}`;

  return (
    <div style={{ paddingTop: 'var(--header-height)', background: 'var(--color-primary)', minHeight: '100vh', color: '#fff' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBreadcrumbSchema([
            { name: 'Trang chủ', url: '/' },
            { name: 'Liên hệ', url: '/lien-he' },
          ])),
        }}
      />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '64px 20px 80px' }}>
        <header style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ color: 'var(--color-gold)', letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700, marginBottom: '12px' }}>
            Kết nối cùng MITOO
          </p>
          <h1 style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', margin: 0 }}>
            {heading}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.68)', maxWidth: '640px', margin: '16px auto 0', lineHeight: 1.75 }}>
            Bạn có thể sử dụng các thông tin dưới đây để liên hệ với {siteName}.
          </p>
        </header>

        {phone || email || address || openingHours ? (
          <section
            aria-label="Thông tin liên hệ"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}
          >
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} style={{ color: 'inherit', textDecoration: 'none', padding: '24px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
                <FiPhone aria-hidden="true" style={{ color: 'var(--color-gold)', fontSize: '1.35rem', marginBottom: '14px' }} />
                <strong style={{ display: 'block', marginBottom: '8px' }}>Điện thoại</strong>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{phone}</span>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} style={{ color: 'inherit', textDecoration: 'none', padding: '24px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
                <FiMail aria-hidden="true" style={{ color: 'var(--color-gold)', fontSize: '1.35rem', marginBottom: '14px' }} />
                <strong style={{ display: 'block', marginBottom: '8px' }}>Email</strong>
                <span style={{ color: 'rgba(255,255,255,0.7)', overflowWrap: 'anywhere' }}>{email}</span>
              </a>
            )}
            {address && (
              <div style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
                <FiMapPin aria-hidden="true" style={{ color: 'var(--color-gold)', fontSize: '1.35rem', marginBottom: '14px' }} />
                <strong style={{ display: 'block', marginBottom: '8px' }}>Địa chỉ</strong>
                <span style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{address}</span>
              </div>
            )}
            {openingHours && (
              <div style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', background: 'rgba(255,255,255,0.04)' }}>
                <FiClock aria-hidden="true" style={{ color: 'var(--color-gold)', fontSize: '1.35rem', marginBottom: '14px' }} />
                <strong style={{ display: 'block', marginBottom: '8px' }}>Giờ hoạt động</strong>
                <span style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{openingHours}</span>
              </div>
            )}
          </section>
        ) : (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', padding: '32px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px' }}>
            Thông tin liên hệ đang được cập nhật.
          </p>
        )}
      </main>
    </div>
  );
}
