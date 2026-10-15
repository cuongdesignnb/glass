import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync('src/app/(public)/san-pham/[slug]/product-detail.css', 'utf8');

test('list items wrapped in <p> by the rich editor stay compact in product content', () => {
  assert.match(css, /\.rich-content li > p \{ margin-bottom: 0; \}/);
  assert.match(css, /\.rich-content li > p \+ p \{ margin-top: 8px; \}/);
});
