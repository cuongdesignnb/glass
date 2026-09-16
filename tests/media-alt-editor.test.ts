import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');
const picker = read('src/components/admin/MediaPicker.tsx');
const mediaPage = read('src/app/admin/media/page.tsx');
const settings = read('src/app/admin/settings/page.tsx');
const editorStyles = read('src/app/admin/admin.css');
const mediaController = read('backend/app/Http/Controllers/Api/MediaController.php');

test('all admin media uploads collect descriptive alt text before sending', () => {
  assert.match(picker, /aria-label="Alt ảnh"/);
  assert.match(picker, /formData\.append\('alt',/);
  assert.match(mediaPage, /aria-label="Alt ảnh"/);
  assert.match(mediaPage, /formData\.append\('alt',/);
  assert.match(settings, /formData\.append\("alt",/);
  assert.match(mediaController, /'alt'\s*=>\s*'required\|string\|max:255'/);
});

test('rich editor toolbar remains available while scrolling long content', () => {
  assert.match(editorStyles, /\.tiptap-toolbar\s*\{[\s\S]*position:\s*sticky/);
  assert.match(editorStyles, /\.tiptap-toolbar\s*\{[\s\S]*top:\s*56px/);
  assert.match(editorStyles, /\.tiptap-editor\s*\{[\s\S]*overflow:\s*visible/);
});
