import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeClient = readFileSync('src/app/(public)/HomeClient.tsx', 'utf8');
const homeStyles = readFileSync('src/app/(public)/home.css', 'utf8');

test('homepage category cards render descriptions as text and paginate long lists', () => {
  assert.match(homeClient, /function plainText\(value: unknown\)/);
  assert.match(homeClient, /plainText\(category\.description\)/);
  assert.match(homeClient, /const CATEGORY_PAGE_SIZE = 6/);
  assert.match(homeClient, /visibleCount/);
  assert.match(homeClient, /Xem thêm/);
  assert.match(homeClient, /Thu gọn/);
  assert.match(homeClient, /aria-controls="homepage-category-list"/);
  assert.match(homeClient, /aria-expanded=\{isCollapsed\}/);
});

test('homepage category expand control has visible, keyboard-focusable styling', () => {
  assert.match(homeStyles, /\.category-showcase__actions\s*\{/);
  assert.match(homeStyles, /\.category-showcase__more\s*\{/);
  assert.match(homeStyles, /\.category-showcase__more:focus-visible\s*\{/);
});
