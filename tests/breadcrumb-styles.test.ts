import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync('src/components/layout/Breadcrumb.tsx', 'utf8');
const sharedCss = readFileSync('src/components/layout/Breadcrumb.css', 'utf8');
const productDetailCss = readFileSync('src/app/(public)/san-pham/[slug]/product-detail.css', 'utf8');
const productsCss = readFileSync('src/app/(public)/san-pham/products.css', 'utf8');

test('Breadcrumb loads its own stylesheet so every page that renders it is styled', () => {
  assert.match(component, /import '\.\/Breadcrumb\.css';/);
  for (const selector of ['.breadcrumb__list', '.breadcrumb__item', '.breadcrumb__separator', '.breadcrumb__current']) {
    assert.ok(sharedCss.includes(selector), `${selector} missing from Breadcrumb.css`);
  }
  assert.match(sharedCss, /\.breadcrumb__list \{[^}]*display: flex;/);
});

test('breadcrumb base styles are defined once, not duplicated in the product detail stylesheet', () => {
  assert.doesNotMatch(productDetailCss, /\.breadcrumb__list/);
});

test('listing header centers the breadcrumb row', () => {
  assert.match(productsCss, /\.products-header \.breadcrumb__list \{[^}]*justify-content: center;/);
});
