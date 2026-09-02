import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const categoryPage = readFileSync('src/app/(public)/danh-muc/[slug]/page.tsx', 'utf8');
const hub = readFileSync('src/app/(public)/danh-muc/[slug]/CategoryChildrenHub.tsx', 'utf8');
const productStyles = readFileSync('src/app/(public)/san-pham/products.css', 'utf8');

test('category pages server-render an active child-category hub from API data', () => {
  assert.match(categoryPage, /CategoryChildrenHub/);
  assert.match(categoryPage, /categories=\{category\.children\}/);
  assert.doesNotMatch(hub, /^['"]use client['"]/m);
  assert.match(hub, /\.filter\(\(child\) => child\.is_active !== false\)/);
  assert.match(hub, /Number\(a\.order\)\s*\|\|\s*0/);
  assert.match(hub, /Number\(a\.id\)\s*\|\|\s*0/);
});

test('child hub keeps clean dynamic links, content fields and bounded descriptions', () => {
  assert.doesNotMatch(hub, /categories\.slice\(0\s*,/);
  assert.match(hub, /encodeURIComponent\(child\.slug/);
  assert.match(hub, /child\.image \|\| child\.icon/);
  assert.match(hub, /alt=\{childName\}/);
  assert.match(hub, /child\.products_count/);
  assert.match(hub, /DESCRIPTION_LIMIT = 150/);
  assert.match(hub, /plainText\(value: unknown\)/);
  assert.match(hub, /Chọn Gọng Kính Theo Kiểu Dáng & Chất Liệu/);
});

test('category child hub is responsive and does not alter product listing primitives', () => {
  assert.match(productStyles, /\.category-child-hub__grid\s*\{/);
  assert.match(productStyles, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)/);
  assert.match(productStyles, /@media \(max-width: 1024px\)/);
  assert.match(productStyles, /@media \(max-width: 768px\)/);
  assert.match(productStyles, /@media \(max-width: 480px\)/);
  assert.match(categoryPage, /className="product-grid"/);
  assert.match(categoryPage, /className="pagination"/);
});
