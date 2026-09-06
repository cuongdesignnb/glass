import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  articleListingCanonicalPolicy,
  productListingCanonicalPolicy,
} from '../src/lib/listing-params.ts';

const articlePage = readFileSync('src/app/(public)/bai-viet/page.tsx', 'utf8');

test('article base listing remains indexable with a clean canonical URL', () => {
  assert.deepEqual(articleListingCanonicalPolicy({}), {
    canonicalUrl: '/bai-viet',
    isFacetUrl: false,
    robots: { index: true, follow: true },
  });
});

test('article pagination keeps its self canonical and remains indexable', () => {
  assert.deepEqual(articleListingCanonicalPolicy({ page: '2' }), {
    canonicalUrl: '/bai-viet?page=2',
    isFacetUrl: false,
    robots: { index: true, follow: true },
  });
});

test('article search is a noindex facet owned by the base listing', () => {
  assert.deepEqual(articleListingCanonicalPolicy({ search: 'kinh' }), {
    canonicalUrl: '/bai-viet',
    isFacetUrl: true,
    robots: { index: false, follow: true },
  });
});

test('article category is a noindex facet owned by the base listing', () => {
  assert.deepEqual(articleListingCanonicalPolicy({ category: 'kien-thuc' }), {
    canonicalUrl: '/bai-viet',
    isFacetUrl: true,
    robots: { index: false, follow: true },
  });
});

test('legacy article tag is covered by the same facet policy', () => {
  assert.deepEqual(articleListingCanonicalPolicy({ tag: 'kien-thuc' }), {
    canonicalUrl: '/bai-viet',
    isFacetUrl: true,
    robots: { index: false, follow: true },
  });
});

test('article multi-facet URLs stay noindex with the base canonical', () => {
  assert.deepEqual(articleListingCanonicalPolicy({
    category: 'kien-thuc',
    search: 'gong kinh',
    page: '2',
  }), {
    canonicalUrl: '/bai-viet',
    isFacetUrl: true,
    robots: { index: false, follow: true },
  });
});

test('article metadata and CollectionPage schema share seoPolicy while the client keeps listingUrl', () => {
  assert.match(articlePage, /articleListingCanonicalPolicy/);
  assert.match(articlePage, /url: seoPolicy\.canonicalUrl/);
  assert.match(articlePage, /robots: seoPolicy\.robots/);
  assert.match(articlePage, /const listingUrl = articleListingUrl\(filters\)/);
  assert.match(articlePage, /<ArticleListingClient\s+key=\{listingUrl\}/);
  assert.doesNotMatch(articlePage, /key=\{seoPolicy\.canonicalUrl\}/);
  assert.doesNotMatch(articlePage, /url: articleListingUrl\(filters\)/);
});

test('product canonical policy remains unchanged for base and material facet URLs', () => {
  assert.deepEqual(productListingCanonicalPolicy({}), {
    canonicalUrl: '/san-pham',
    isFacetUrl: false,
    robots: { index: true, follow: true },
  });
  assert.deepEqual(productListingCanonicalPolicy({ material: 'tr90' }), {
    canonicalUrl: '/san-pham',
    isFacetUrl: true,
    robots: { index: false, follow: true },
  });
});
