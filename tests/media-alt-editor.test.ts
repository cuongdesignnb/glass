import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');
const picker = read('src/components/admin/MediaPicker.tsx');
const mediaPage = read('src/app/admin/media/page.tsx');
const settings = read('src/app/admin/settings/page.tsx');
const editorStyles = read('src/app/admin/admin.css');
const globalStyles = read('src/app/globals.css');
const mediaController = read('backend/app/Http/Controllers/Api/MediaController.php');

test('all admin media uploads collect descriptive alt text before sending', () => {
  assert.match(picker, /aria-label="Alt ảnh"/);
  assert.match(picker, /formData\.append\('alt',/);
  assert.match(mediaPage, /aria-label="Alt ảnh"/);
  assert.match(mediaPage, /data-testid="media-upload-alt"/);
  assert.match(mediaPage, /Thông tin ảnh tải lên/);
  assert.match(picker, /data-testid="media-picker-upload-alt"/);
  assert.match(picker, /Thông tin ảnh tải lên/);
  assert.match(mediaPage, /formData\.append\('alt',/);
  assert.match(settings, /formData\.append\("alt",/);
  assert.match(mediaController, /'alt'\s*=>\s*'required\|string\|max:255'/);
});

test('rich editor toolbar remains available while scrolling long content', () => {
  assert.match(editorStyles, /\.tiptap-toolbar\s*\{[\s\S]*position:\s*sticky/);
  assert.match(editorStyles, /\.admin-layout\s*\{[\s\S]*--admin-topbar-height:\s*72px/);
  assert.match(editorStyles, /\.tiptap-toolbar\s*\{[\s\S]*top:\s*var\(--admin-topbar-height\)/);
  assert.match(editorStyles, /\.tiptap-editor\s*\{[\s\S]*overflow:\s*visible/);
  assert.match(globalStyles, /html\s*\{[\s\S]*overflow-x:\s*clip/);
  assert.match(globalStyles, /body\s*\{[\s\S]*overflow-x:\s*clip/);
});
