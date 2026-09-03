import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const categoryPage = readFileSync('src/app/(public)/danh-muc/[slug]/page.tsx', 'utf8');

test('category breadcrumb builds a dynamic parent hierarchy from the API relation', () => {
  assert.match(categoryPage, /import Breadcrumb from ['"]@\/components\/layout\/Breadcrumb['"]/);
  assert.match(categoryPage, /const parent = category\.parent/);
  assert.match(categoryPage, /parent\.slug/);
  assert.match(categoryPage, /parent\.name/);
  assert.match(categoryPage, /parent\.is_active !== false/);
  assert.match(categoryPage, /encodeURIComponent\(parent\.slug\)/);
  assert.match(categoryPage, /<Breadcrumb items=\{breadcrumb\} \/>/);
  assert.match(categoryPage, /breadcrumb\.push\(\{ name: category\.name/);
});

test('category breadcrumb delegates BreadcrumbList schema to the shared component', () => {
  assert.doesNotMatch(categoryPage, /generateBreadcrumbSchema\(breadcrumb\)/);
  assert.match(categoryPage, /<Breadcrumb items=\{breadcrumb\} \/>/);
  assert.doesNotMatch(categoryPage, /gong-kinh|gong-kinh-panto/);
});

test('category breadcrumb keeps the current category as the only H1', () => {
  assert.match(categoryPage, /<h1 className="heading-lg">\{category\.name\}<\/h1>/);
  assert.doesNotMatch(categoryPage, /<h1[^>]*>\{parent\.name\}/);
});
