import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');
const migration = read('backend/database/migrations/2026_09_18_000001_add_author_role_to_articles_table.php');
const model = read('backend/app/Models/Article.php');
const controller = read('backend/app/Http/Controllers/Api/ArticleController.php');
const editor = read('src/app/admin/articles/[id]/page.tsx');
const detail = read('src/app/(public)/bai-viet/[slug]/ArticleDetailClient.tsx');

test('article author role is persisted as an optional API field', () => {
  assert.match(migration, /string\('author_role',\s*255\)->nullable\(\)->after\('author'\)/);
  assert.match(migration, /dropColumn\('author_role'\)/);
  assert.match(model, /'author_role'/);
  assert.equal((controller.match(/'author_role'\s*=>\s*'nullable\|string\|max:255'/g) || []).length, 2);
});

test('admin can load and save author role without a hardcoded public fallback', () => {
  assert.match(editor, /author_role:\s*''/);
  assert.match(editor, /author_role:\s*article\.author_role\s*\|\|\s*''/);
  assert.match(editor, /Vai trò tác giả/);
  assert.match(editor, /Ví dụ: Biên tập nội dung kính mắt MITOO/);
  assert.match(editor, /value=\{form\.author_role\}/);
  assert.match(editor, /author_role:\s*e\.target\.value/);
  assert.doesNotMatch(editor, /author_role\s*\|\|\s*['"]Biên tập nội dung kính mắt MITOO/);
});

test('public article detail renders only the CMS author role', () => {
  assert.match(detail, /article\.author_role\s*&&/);
  assert.match(detail, /className="article-hero__author-role"\s*>\{article\.author_role\}/);
  assert.doesNotMatch(detail, /author_role\s*\|\|\s*['"](?:Đội ngũ MITOO|Biên tập nội dung kính mắt MITOO)/);
});
