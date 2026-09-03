import Link from 'next/link';
import { productCategoryUrl } from '@/lib/listing-params';

type ProductCategory = {
  id?: number | string | null;
  slug?: string | null;
  name?: string | null;
  is_active?: boolean | number | null;
};

type ProductCategoryLinksProps = {
  primaryCategory?: ProductCategory | null;
  categories?: ProductCategory[] | null;
};

function getLinkedCategories(
  primaryCategory: ProductCategory | null | undefined,
  categories: ProductCategory[] | null | undefined,
): ProductCategory[] {
  const primarySlug = typeof primaryCategory?.slug === 'string'
    ? primaryCategory.slug.trim()
    : '';
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  return (Array.isArray(categories) ? categories : []).filter((category) => {
    const slug = typeof category.slug === 'string' ? category.slug.trim() : '';
    const name = typeof category.name === 'string' ? category.name.trim() : '';

    if (category.is_active === false || !slug || !name || slug === primarySlug) return false;

    const id = category.id === null || category.id === undefined ? '' : String(category.id);
    if (seenSlugs.has(slug) || (id && seenIds.has(id))) return false;

    seenSlugs.add(slug);
    if (id) seenIds.add(id);
    return true;
  });
}

export default function ProductCategoryLinks({ primaryCategory, categories }: ProductCategoryLinksProps) {
  const linkedCategories = getLinkedCategories(primaryCategory, categories);
  if (linkedCategories.length === 0) return null;

  return (
    <nav className="product-category-links" aria-label="Danh mục sản phẩm">
      <span className="product-category-links__label">Thuộc danh mục:</span>
      <div className="product-category-links__items">
        {linkedCategories.map((category) => (
          <Link
            key={category.id || category.slug}
            href={productCategoryUrl(category)}
            className="product-category-links__item"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
