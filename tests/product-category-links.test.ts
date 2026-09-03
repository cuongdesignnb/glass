import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const productPage = readFileSync('src/app/(public)/san-pham/[slug]/page.tsx', 'utf8');
const links = readFileSync('src/app/(public)/san-pham/[slug]/ProductCategoryLinks.tsx', 'utf8');
const styles = readFileSync('src/app/(public)/san-pham/[slug]/product-detail.css', 'utf8');

test('product detail server-renders category links from product relationships', () => {
  assert.match(productPage, /ProductCategoryLinks/);
  assert.match(productPage, /primaryCategory=\{product\.category\}/);
  assert.match(productPage, /categories=\{product\.categories\}/);
  assert.match(productPage, /<Breadcrumb items=\{breadcrumbItems\} \/>[\s\S]*<ProductCategoryLinks/);
  assert.match(links, /aria-label="Danh mục sản phẩm"/);
  assert.match(links, /<Link/);
  assert.match(links, /productCategoryUrl\(category\)/);
  assert.doesNotMatch(links, /rel=\{?['"](?:nofollow|ugc|sponsored)['"]/i);
});

test('category links filter invalid and inactive records, dedupe and exclude primary', () => {
  assert.doesNotMatch(links, /^['"]use client['"]/m);
  assert.doesNotMatch(links, /useEffect|useState|window\./);
  assert.match(links, /category\.is_active === false/);
  assert.match(links, /!slug \|\| !name/);
  assert.match(links, /slug === primarySlug/);
  assert.match(links, /seenIds/);
  assert.match(links, /seenSlugs/);
  assert.doesNotMatch(links, /\.slice\(/);
});

test('category link block wraps cleanly on smaller screens and remains keyboard accessible', () => {
  assert.match(styles, /\.product-category-links\s*\{/);
  assert.match(styles, /flex-wrap:\s*wrap/);
  assert.match(styles, /\.product-category-links__item:focus-visible\s*\{/);
  assert.match(styles, /@media \(max-width: 768px\)/);
  assert.match(styles, /@media \(max-width: 480px\)/);
});
