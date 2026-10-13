import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { isOutOfRangePage } from '../src/lib/listing-params.ts';

test('pages beyond the last page are out of range', () => {
  assert.equal(isOutOfRangePage('2', { last_page: 1 }), true);
  assert.equal(isOutOfRangePage('99', { last_page: 3 }), true);
  assert.equal(isOutOfRangePage(4, { last_page: 3 }), true);
});

test('real pages and the first page are never out of range', () => {
  assert.equal(isOutOfRangePage('1', { last_page: 1 }), false);
  assert.equal(isOutOfRangePage('3', { last_page: 3 }), false);
  assert.equal(isOutOfRangePage('1', { last_page: 0 }), false);
});

test('a failed or malformed API response is not treated as out of range', () => {
  assert.equal(isOutOfRangePage('5', null), false);
  assert.equal(isOutOfRangePage('5', undefined), false);
  assert.equal(isOutOfRangePage('5', {}), false);
  assert.equal(isOutOfRangePage('5', { last_page: 'x' }), false);
});

for (const [name, path, response] of [
  ['category', 'src/app/(public)/danh-muc/[slug]/page.tsx', 'response'],
  ['product', 'src/app/(public)/san-pham/page.tsx', 'productResponse'],
  ['article', 'src/app/(public)/bai-viet/page.tsx', 'articleResponse'],
] as const) {
  test(`${name} listing returns 404 for out-of-range pages and keeps API errors distinguishable`, () => {
    const source = readFileSync(path, 'utf8');
    assert.ok(source.includes(`if (isOutOfRangePage(filters.page, ${response})) notFound();`));
    assert.match(source, /\.catch\(\(\) => null\)/);
    assert.doesNotMatch(source, /last_page: 1, total: 0 \}\)\)/);
  });
}
