import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { productListingCanonicalPolicy } from '../src/lib/listing-params.ts';

const read = (path: string) => readFileSync(path, 'utf8');

test('product listing canonical policy separates clean pagination from functional facets', () => {
  assert.deepEqual(productListingCanonicalPolicy({}), {
    canonicalUrl: '/san-pham',
    isFacetUrl: false,
    robots: { index: true, follow: true },
  });

  assert.deepEqual(productListingCanonicalPolicy({ page: '2' }), {
    canonicalUrl: '/san-pham?page=2',
    isFacetUrl: false,
    robots: { index: true, follow: true },
  });

  for (const raw of [
    { category: 'gong-kinh' },
    { color: '#000000' },
    { search: 'panto' },
    { sort: 'price-asc' },
    { category: 'gong-kinh', color: '#000000', page: '2' },
  ]) {
    const policy = productListingCanonicalPolicy(raw);
    assert.equal(policy.canonicalUrl, '/san-pham');
    assert.equal(policy.isFacetUrl, true);
    assert.deepEqual(policy.robots, { index: false, follow: true });
  }
});

test('category navigation seed and sitemap keep clean category URLs', () => {
  const seeder = read('backend/database/seeders/DatabaseSeeder.php');
  const sitemap = read('src/app/sitemap.ts');

  assert.doesNotMatch(seeder, /\/san-pham\?category=/);
  assert.match(seeder, /\/danh-muc\/gong-kinh/);
  assert.doesNotMatch(sitemap, /\/san-pham\?category=/);
  assert.match(sitemap, /\/danh-muc\/\$\{category\.slug\}/);
});

test('product variant schema stays on the clean canonical product URL', () => {
  const productPage = read('src/app/(public)/san-pham/[slug]/page.tsx');
  const seo = read('src/lib/seo.ts');

  assert.ok(productPage.includes('const schemaUrl = `/san-pham/${product.slug}`;'));
  assert.doesNotMatch(productPage, /schemaUrl[\s\S]*\?color=|schemaUrl[\s\S]*\?option_ids=/);
  assert.match(seo, /url: `\$\{APP_URL\}\$\{product\.url\}`/);
});
