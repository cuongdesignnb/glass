import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const editor = readFileSync('src/components/admin/RichEditor.tsx', 'utf8');

test('editorial links default to same-tab without automatic nofollow', () => {
  assert.match(editor, /const EditorialLink = Link\.extend\(/);
  assert.match(editor, /target:\s*null/);
  assert.match(editor, /rel:\s*null/);
  assert.match(editor, /EditorialLink\.configure\(\{[\s\S]*openOnClick:\s*false/);
  assert.doesNotMatch(editor, /Link\.configure\(\{\s*openOnClick:\s*false\s*\}\)/);
});

test('existing explicit target and rel attributes are parsed and preserved', () => {
  assert.match(editor, /target:\s*\{[\s\S]*parseHTML:\s*\(element: HTMLElement\) => element\.getAttribute\('target'\)/);
  assert.match(editor, /rel:\s*\{[\s\S]*parseHTML:\s*\(element: HTMLElement\) => element\.getAttribute\('rel'\)/);
  assert.match(editor, /const previousAttributes = editor\.getAttributes\('link'\)/);
  assert.match(editor, /prompt\('Target \(để trống để mở cùng tab\):'/);
  assert.match(editor, /prompt\('Rel \(để trống nếu không cần\):'/);
});

test('link editing keeps safe URL validation and supports cancel/unlink semantics', () => {
  assert.match(editor, /EditorialLink\.configure\(/);
  assert.match(editor, /if \(url === null\) return/);
  assert.match(editor, /if \(!nextUrl\)/);
  assert.match(editor, /chain\.unsetLink\(\)\.run\(\)/);
  assert.match(editor, /chain\.setLink\(linkAttributes\)\.run\(\)/);
  assert.match(editor, /linkAttributes\.target = target\.trim\(\) \|\| null/);
  assert.match(editor, /linkAttributes\.rel = rel\.trim\(\) \|\| null/);
});

test('relative URLs with query strings and fragments remain passed unchanged', () => {
  assert.match(editor, /const nextUrl = url\.trim\(\)/);
  assert.match(editor, /href: nextUrl/);
  assert.doesNotMatch(editor, /new URL\(nextUrl/);
});

test('rich image and article slug paths remain in scope', () => {
  assert.match(editor, /RichImage\.configure/);
  assert.match(editor, /editor\.getHTML\(\)/);
  assert.doesNotMatch(editor, /regenerate_slug/);
});
