export type RawSearchParams = Record<string, string | string[] | undefined>;

export type ProductListingFilters = {
  gender: string;
  color: string;
  face_shape: string;
  frame_style: string;
  material: string;
  category_slug: string;
  price_min: string;
  price_max: string;
  sort: string;
  search: string;
  page: string;
};

export type ArticleListingFilters = {
  category: string;
  search: string;
  sort: string;
  page: string;
};

const PRODUCT_SORTS = new Set(['newest', 'price-asc', 'price-desc', 'popular', 'bestselling']);
const ARTICLE_SORTS = new Set(['newest']);

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value || '').trim();
}

function token(value: string, maxLength = 80): string {
  return /^[a-zA-Z0-9#._-]+$/.test(value) ? value.slice(0, maxLength) : '';
}

function text(value: string, maxLength = 120): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
}

function positiveInteger(value: string): string {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? String(parsed) : '1';
}

function price(value: string): string {
  return /^\d{1,12}$/.test(value) ? String(Number(value)) : '';
}

export function normalizeProductSearchParams(raw: RawSearchParams = {}): ProductListingFilters {
  const legacyFace = firstValue(raw.face_shape);
  const sort = firstValue(raw.sort);

  return {
    gender: token(firstValue(raw.gender)),
    color: token(firstValue(raw.color)),
    face_shape: token(firstValue(raw.face) || legacyFace),
    frame_style: token(firstValue(raw.frame_style)),
    material: token(firstValue(raw.material)),
    category_slug: token(firstValue(raw.category)),
    price_min: price(firstValue(raw.price_min)),
    price_max: price(firstValue(raw.price_max)),
    sort: PRODUCT_SORTS.has(sort) ? sort : 'newest',
    search: text(firstValue(raw.search)),
    page: positiveInteger(firstValue(raw.page)),
  };
}

export function productApiParams(filters: ProductListingFilters): Record<string, string> {
  const params: Record<string, string> = { per_page: '12', page: filters.page, sort: filters.sort };
  for (const key of ['gender', 'color', 'face_shape', 'frame_style', 'material', 'category_slug', 'price_min', 'price_max', 'search'] as const) {
    if (filters[key]) params[key] = filters[key];
  }
  return params;
}

export function productListingUrl(filters: ProductListingFilters): string {
  const params = new URLSearchParams();
  const urlKeys: Array<[keyof ProductListingFilters, string]> = [
    ['category_slug', 'category'],
    ['gender', 'gender'],
    ['color', 'color'],
    ['face_shape', 'face'],
    ['frame_style', 'frame_style'],
    ['material', 'material'],
    ['price_min', 'price_min'],
    ['price_max', 'price_max'],
    ['sort', 'sort'],
    ['search', 'search'],
    ['page', 'page'],
  ];
  for (const [key, urlKey] of urlKeys) {
    const value = filters[key];
    if (!value || (key === 'sort' && value === 'newest') || (key === 'page' && value === '1')) continue;
    params.set(urlKey, value);
  }
  const query = params.toString();
  return query ? `/san-pham?${query}` : '/san-pham';
}

export function productCategoryUrl(category: { slug?: unknown } | null | undefined): string {
  const slug = token(String(category?.slug || ''));
  return slug ? productListingUrl({
    gender: '',
    color: '',
    face_shape: '',
    frame_style: '',
    material: '',
    category_slug: slug,
    price_min: '',
    price_max: '',
    sort: 'newest',
    search: '',
    page: '1',
  }) : '/san-pham';
}

export function normalizeArticleSearchParams(raw: RawSearchParams = {}): ArticleListingFilters {
  const sort = firstValue(raw.sort);
  return {
    category: token(firstValue(raw.category) || firstValue(raw.tag)),
    search: text(firstValue(raw.search)),
    sort: ARTICLE_SORTS.has(sort) ? sort : 'newest',
    page: positiveInteger(firstValue(raw.page)),
  };
}

export function articleApiParams(filters: ArticleListingFilters): Record<string, string> {
  const params: Record<string, string> = { per_page: '9', page: filters.page, sort: filters.sort };
  if (filters.category) params.tag = filters.category;
  if (filters.search) params.search = filters.search;
  return params;
}

export function articleListingUrl(filters: ArticleListingFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.page !== '1') params.set('page', filters.page);
  const query = params.toString();
  return query ? `/bai-viet?${query}` : '/bai-viet';
}
