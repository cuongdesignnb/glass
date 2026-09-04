import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { productImageSources } from '../src/lib/product-image-sources.ts';

const productPage = readFileSync('src/app/(public)/san-pham/[slug]/page.tsx', 'utf8');

test('thumbnail-only products use the thumbnail as the final image fallback', () => {
  assert.deepEqual(productImageSources({
    variantImages: [],
    galleryImages: [],
    thumbnail: '/thumb.webp',
  }), ['/thumb.webp']);
});

test('gallery images take priority over the thumbnail', () => {
  assert.deepEqual(productImageSources({
    variantImages: [],
    galleryImages: ['/gallery-a.webp', '/gallery-b.webp'],
    thumbnail: '/thumb.webp',
  }), ['/gallery-a.webp', '/gallery-b.webp']);
});

test('variant and gallery images merge in order without duplicates', () => {
  assert.deepEqual(productImageSources({
    variantImages: ['/a.webp', '/b.webp'],
    galleryImages: ['/b.webp', '/c.webp'],
    thumbnail: '/thumb.webp',
  }), ['/a.webp', '/b.webp', '/c.webp']);
});

test('duplicate image sources are removed while keeping the first occurrence', () => {
  assert.deepEqual(productImageSources({
    variantImages: ['/a.webp', '/a.webp'],
    galleryImages: ['/a.webp'],
  }), ['/a.webp']);
});

test('empty and non-string image values are ignored before thumbnail fallback', () => {
  assert.deepEqual(productImageSources({
    variantImages: ['', '   ', null, 42],
    galleryImages: [],
    thumbnail: ' /thumb.webp ',
  }), ['/thumb.webp']);
});

test('products without any image source remain without a fake placeholder', () => {
  assert.deepEqual(productImageSources({
    variantImages: [],
    galleryImages: [],
    thumbnail: '',
  }), []);
});

test('metadata and Product JSON-LD use the same shared image resolver', () => {
  assert.match(productPage, /import \{ productImageSources \} from ['"]@\/lib\/product-image-sources['"]/);
  assert.equal((productPage.match(/productImageSources\(/g) || []).length, 2);
  assert.equal((productPage.match(/variantImages: selectedVariant\?\.images/g) || []).length, 2);
  assert.equal((productPage.match(/galleryImages: product\.images/g) || []).length, 2);
  assert.equal((productPage.match(/thumbnail: product\.thumbnail/g) || []).length, 2);
  assert.match(productPage, /ogImage: product\.og_image \|\| images\[0\]/);
});

test('schema merchant fields and Offer wiring remain present after image fallback', () => {
  const seo = readFileSync('src/lib/seo.ts', 'utf8');

  assert.match(productPage, /category: typeof product\.category\?\.name === 'string'/);
  assert.match(productPage, /material: productMaterialLabel\(product\.materials\)/);
  assert.match(productPage, /color: productColorLabel\(product\.color_names\)/);
  assert.match(productPage, /brand: product\.brand/);
  assert.match(productPage, /sku: product\.sku/);
  for (const field of [
    /'@type': 'Offer'/,
    /priceCurrency: 'VND'/,
    /price:/,
    /priceValidUntil:/,
    /availability:/,
    /itemCondition:/,
    /url: `\$\{APP_URL\}\$\{product\.url\}`/,
  ]) {
    assert.match(seo, field);
  }
});
