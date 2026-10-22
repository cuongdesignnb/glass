import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync('src/app/(public)/san-pham/[slug]/product-detail.css', 'utf8');

test('images from the rich editor stay compact and centered in product content', () => {
  assert.match(css, /\.rich-content figure\.article-image \{[^}]*text-align: center;/);
  assert.match(css, /\.rich-content figure\.article-image img \{[^}]*max-width: min\(100%, 420px\);/);
  assert.match(css, /\.rich-content figure\.article-image img \{[^}]*margin: 0 auto;/);
});

test('image captions in product content are small and muted', () => {
  assert.match(css, /\.rich-content figure\.article-image figcaption \{[^}]*font-size: 0\.8125rem;/);
});
