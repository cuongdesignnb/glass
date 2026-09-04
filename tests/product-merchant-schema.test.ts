import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  normalizeOptionalString,
  normalizeStringArray,
  productColorLabel,
  productMaterialLabel,
} from '../src/lib/product-schema-fields.ts';

const seo = readFileSync('src/lib/seo.ts', 'utf8');
const productPage = readFileSync('src/app/(public)/san-pham/[slug]/page.tsx', 'utf8');
const schemaStart = seo.indexOf('export function generateProductSchema');
const schemaEnd = seo.indexOf('// Schema.org Article', schemaStart);
const productSchema = seo.slice(schemaStart, schemaEnd);

test('normalizes material values to human-readable labels without duplicates', () => {
  assert.deepEqual(normalizeStringArray(['kim-loai', 'nhua', 'kim-loai']), [
    'kim-loai',
    'nhua',
  ]);
  assert.equal(productMaterialLabel(['kim-loai', 'nhua', 'kim-loai']), 'Kim loại, Nhựa');
});

test('normalizes color names using the first occurrence and preserves Vietnamese text', () => {
  assert.equal(productColorLabel(['Đen', '', ' Bạc ', 'Đen']), 'Đen / Bạc');
});

test('omits empty optional scalar values instead of emitting blank schema fields', () => {
  assert.equal(normalizeOptionalString(''), undefined);
  assert.equal(normalizeOptionalString('   '), undefined);
  assert.equal(normalizeOptionalString(null), undefined);
  assert.match(productSchema, /sku,/);
  assert.match(productSchema, /brand: brand \?/);
  assert.match(productSchema, /category: normalizeOptionalString\(product\.category\)/);
  assert.match(productSchema, /material: normalizeOptionalString\(product\.material\)/);
  assert.match(productSchema, /color: normalizeOptionalString\(product\.color\)/);
});

test('keeps real category, material, color and brand mappings wired from the product page', () => {
  assert.match(productPage, /category: typeof product\.category\?\.name === 'string'/);
  assert.match(productPage, /material: productMaterialLabel\(product\.materials\)/);
  assert.match(productPage, /color: productColorLabel\(product\.color_names\)/);
  assert.match(productPage, /brand: product\.brand/);
  assert.doesNotMatch(productPage, /brand:\s*['"]MITOO['"]/);
});

test('preserves the Product Offer fields and does not add fake identifiers', () => {
  for (const field of [
    /'@type': 'Offer'/,
    /priceCurrency: 'VND'/,
    /price:/,
    /priceValidUntil:/,
    /availability:/,
    /itemCondition:/,
    /url: `\$\{APP_URL\}\$\{product\.url\}`/,
  ]) {
    assert.match(productSchema, field);
  }

  assert.doesNotMatch(productSchema, /gtin|mpn|gtin8|gtin12|gtin13|gtin14|productID/);
});

test('empty lens attributes produce no material or color label', () => {
  assert.equal(productMaterialLabel([]), undefined);
  assert.equal(productColorLabel([]), undefined);
  assert.equal(productMaterialLabel(null), undefined);
  assert.equal(productColorLabel(undefined), undefined);
});
