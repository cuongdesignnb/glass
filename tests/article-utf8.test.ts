import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const articleSources = [
  'src/app/(public)/bai-viet/page.tsx',
  'src/app/(public)/bai-viet/ArticleListingClient.tsx',
  'src/app/(public)/bai-viet/[slug]/page.tsx',
  'src/app/(public)/bai-viet/[slug]/ArticleDetailClient.tsx',
];

const mojibakeMarker = /[\u00c3\u00c2\u00c6\u00c4].|\u00e1[\u00ba\u00bb]|\u00e2\u20ac|\ufffd/;

test('article listing and detail sources contain clean UTF-8 Vietnamese text', () => {
  for (const sourcePath of articleSources) {
    const source = readFileSync(sourcePath, 'utf8');
    assert.doesNotMatch(source, mojibakeMarker, `${sourcePath} contains mojibake`);
  }

  const listing = readFileSync(articleSources[1], 'utf8');
  assert.match(listing, /Bài Viết & Kiến Thức/);
  assert.match(listing, /Nhật Ký Kính Mắt/);
  assert.match(listing, /placeholder="Tìm kiếm bài viết\.\.\."/);

  const detail = readFileSync(articleSources[3], 'utf8');
  assert.match(detail, /Chia sẻ bài viết/);
  assert.match(detail, /Bài Viết Liên Quan/);
});
