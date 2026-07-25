import { Metadata } from 'next';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { generateMeta } from '@/lib/seo';
import HomeCollections from '../HomeCollections';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: 'Bộ Sưu Tập Kính Mắt',
    description: 'Khám phá các bộ sưu tập kính mắt được tuyển chọn theo phong cách, nhu cầu và xu hướng.',
    url: '/bo-suu-tap',
  });
}

export default async function CollectionsPage() {
  const response = await publicApi.getCollections().catch(() => []);
  const collections = Array.isArray(response)
    ? response.filter((collection: any) => collection.is_active !== false && collection.slug && collection.name)
    : [];

  return (
    <main style={{ paddingTop: 'var(--header-height)', minHeight: '70vh' }}>
      {collections.length > 0 ? (
        <HomeCollections
          collections={collections}
          eyebrow="Khám Phá"
          title="Tất Cả Bộ Sưu Tập"
          description="Mỗi bộ sưu tập được quản lý từ Admin và liên kết trực tiếp tới những sản phẩm đã được lựa chọn."
        />
      ) : (
        <section className="section">
          <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-4xl)', paddingBottom: 'var(--space-4xl)' }}>
            <h1 className="section__title">Bộ sưu tập đang được cập nhật</h1>
            <p className="section__subtitle">Các bộ sưu tập mới sẽ sớm được bổ sung.</p>
            <Link href="/san-pham" className="btn btn-primary" style={{ marginTop: 'var(--space-xl)' }}>Xem tất cả sản phẩm</Link>
          </div>
        </section>
      )}
    </main>
  );
}
