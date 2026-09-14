import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { vietnameseSlug } from '../src/lib/vietnamese-slug.ts';

const read = (path: string) => readFileSync(path, 'utf8');

test('slug preview follows the backend Vietnamese slug contract', () => {
  assert.equal(vietnameseSlug('Gọng Kính Nhựa MS0016 Dáng Vuông Bo Góc'), 'gong-kinh-nhua-ms0016-dang-vuong-bo-goc');
  assert.equal(vietnameseSlug('  Kính — Panto  '), 'kinh-panto');
  assert.equal(vietnameseSlug(''), '');
});

test('product, article, and collection updates require an explicit regeneration flag', () => {
  const controllers = [
    read('backend/app/Http/Controllers/Api/ProductController.php'),
    read('backend/app/Http/Controllers/Api/ArticleController.php'),
    read('backend/app/Http/Controllers/Api/CollectionController.php'),
  ];

  for (const source of controllers) {
    assert.match(source, /['"]regenerate_slug['"]\s*=>\s*['"]sometimes\|boolean['"]/);
    assert.match(source, /\$regenerateSlug\s*=\s*\(bool\)/);
    assert.match(source, /unset\(\$data\['regenerate_slug'\]\)/);
    assert.match(source, /if\s*\(\$regenerateSlug\)/);
  }
});

test('admin editors expose a visible slug and confirmation before changing an existing URL', () => {
  const editors = [
    read('src/app/admin/products/[id]/page.tsx'),
    read('src/app/admin/articles/[id]/page.tsx'),
    read('src/app/admin/collections/page.tsx'),
  ];
  const confirmation = read('src/components/admin/SlugChangeConfirm.tsx');

  for (const source of editors) {
    assert.match(source, /Slug \/ Đường dẫn URL/);
    assert.match(source, /Generate Slug/);
    assert.match(source, /SlugChangeConfirm/);
    assert.match(source, /regenerate_slug\s*=\s*true/);
  }

  assert.match(confirmation, /Bạn đang thay đổi URL/);
  assert.match(confirmation, /Hủy/);
  assert.match(confirmation, /Xác nhận đổi URL/);
});
