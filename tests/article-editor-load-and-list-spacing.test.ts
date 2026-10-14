import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const editorPage = readFileSync('src/app/admin/articles/[id]/page.tsx', 'utf8');
const articlesCss = readFileSync('src/app/(public)/bai-viet/articles.css', 'utf8');

test('admin article editor loads articles beyond the default first page', () => {
  assert.match(editorPage, /getArticles\(token!, \{ per_page: '500' \}\)/);
});

test('admin article editor reports a missing article instead of silently showing a blank form', () => {
  assert.match(editorPage, /Không tìm thấy bài viết #\$\{params\?\.id\}/);
});

test('list items wrapped in <p> by the rich editor stay compact on public articles', () => {
  assert.match(articlesCss, /\.article-content li > p \{ margin-bottom: 0; \}/);
});
