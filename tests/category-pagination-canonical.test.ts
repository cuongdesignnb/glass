import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { categoryListingCanonicalUrl } from '../src/lib/listing-params.ts';

const categoryPage = readFileSync('src/app/(public)/danh-muc/[slug]/page.tsx', 'utf8');

test('category pagination keeps clean and valid self-canonical URLs', () => {
  assert.equal(categoryListingCanonicalUrl('gong-kinh-da-giac'), '/danh-muc/gong-kinh-da-giac');
  assert.equal(categoryListingCanonicalUrl('gong-kinh-da-giac', { page: '1' }), '/danh-muc/gong-kinh-da-giac');
  assert.equal(categoryListingCanonicalUrl('gong-kinh-da-giac', { page: '2' }), '/danh-muc/gong-kinh-da-giac?page=2');
});

test('invalid category page values normalize to the first-page canonical', () => {
  for (const page of ['abc', '0', '-1']) {
    assert.equal(categoryListingCanonicalUrl('gong-kinh-da-giac', { page }), '/danh-muc/gong-kinh-da-giac');
  }
});

test('category metadata uses the same page normalization as product listing filters', () => {
  assert.match(categoryPage, /categoryListingCanonicalUrl\(category\.slug, resolved\)/);
  assert.match(categoryPage, /normalizeProductSearchParams\(\{ category: category\.slug, page \}\)/);
});
