import Link from 'next/link';
import Image from 'next/image';
import { RiGlassesLine } from 'react-icons/ri';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
const DESCRIPTION_LIMIT = 150;

export function plainText(value: unknown): string {
  if (typeof value !== 'string') return '';

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveCategoryImage(path: unknown): string | null {
  if (typeof path !== 'string' || !path.trim()) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

function shortDescription(value: unknown): string {
  const text = plainText(value);
  if (text.length <= DESCRIPTION_LIMIT) return text;
  return `${text.slice(0, DESCRIPTION_LIMIT).trimEnd()}…`;
}

type CategoryChild = {
  id?: number | string;
  slug?: string;
  name?: string;
  description?: string | null;
  image?: string | null;
  icon?: string | null;
  products_count?: number | string | null;
  is_active?: boolean | number | null;
  order?: number | string | null;
};

type CategoryChildrenHubProps = {
  categoryName: string;
  categories?: CategoryChild[] | null;
};

export default function CategoryChildrenHub({ categoryName, categories }: CategoryChildrenHubProps) {
  const childCategories = (Array.isArray(categories) ? categories : [])
    .filter((child) => child.is_active !== false)
    .sort((a, b) => {
      const orderDiff = (Number(a.order) || 0) - (Number(b.order) || 0);
      if (orderDiff !== 0) return orderDiff;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

  if (childCategories.length === 0) return null;

  const isGlassesFrameCategory = categoryName.trim().toLocaleLowerCase() === 'gọng kính';
  const heading = isGlassesFrameCategory
    ? 'Chọn Gọng Kính Theo Kiểu Dáng & Chất Liệu'
    : `Khám Phá ${categoryName} Theo Danh Mục`;
  const subtitle = isGlassesFrameCategory
    ? 'Khám phá các dòng gọng kính theo kiểu dáng và chất liệu để lựa chọn nhanh mẫu phù hợp với nhu cầu của bạn.'
    : `Khám phá các dòng ${categoryName.toLowerCase()} theo từng danh mục để lựa chọn nhanh sản phẩm phù hợp với nhu cầu của bạn.`;

  return (
    <section className="category-child-hub" aria-labelledby="category-child-hub-title">
      <div className="container">
        <header className="category-child-hub__header">
          <span className="category-child-hub__eyebrow">Danh mục</span>
          <h2 id="category-child-hub-title" className="category-child-hub__title">{heading}</h2>
          <p className="category-child-hub__subtitle">{subtitle}</p>
        </header>

        <div className="category-child-hub__grid">
          {childCategories.map((child) => {
            const imageSource = resolveCategoryImage(child.image || child.icon);
            const description = shortDescription(child.description);
            const childName = child.name || 'Danh mục kính mắt';
            const childHref = `/danh-muc/${encodeURIComponent(child.slug || String(child.id || ''))}`;

            return (
              <article key={child.id || child.slug} className="category-child-card">
                <div className="category-child-card__visual">
                  {imageSource ? (
                    <Image
                      src={imageSource}
                      alt={childName}
                      fill
                      sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="category-child-card__image"
                    />
                  ) : (
                    <RiGlassesLine className="category-child-card__fallback" aria-hidden="true" />
                  )}
                </div>
                <div className="category-child-card__body">
                  <h3 className="category-child-card__title">
                    <Link href={childHref}>{childName}</Link>
                  </h3>
                  <p className="category-child-card__description">
                    {description || `Khám phá các mẫu ${childName.toLowerCase()} phù hợp với phong cách của bạn.`}
                  </p>
                  <span className="category-child-card__count">{Number(child.products_count) || 0} sản phẩm</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
