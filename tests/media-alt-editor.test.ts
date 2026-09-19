import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');
const picker = read('src/components/admin/MediaPicker.tsx');
const richEditor = read('src/components/admin/RichEditor.tsx');
const apiSource = read('src/lib/api.ts');
const mediaPage = read('src/app/admin/media/page.tsx');
const articleEditor = read('src/app/admin/articles/[id]/page.tsx');
const productEditor = read('src/app/admin/products/[id]/page.tsx');
const settings = read('src/app/admin/settings/page.tsx');
const editorStyles = read('src/app/admin/admin.css');
const globalStyles = read('src/app/globals.css');
const mediaController = read('backend/app/Http/Controllers/Api/MediaController.php');
const imageSeoMetadataTest = read('backend/tests/Feature/ImageSeoMetadataTest.php');

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

test('rich editor edits links without losing existing href or relative URLs', () => {
  assert.match(richEditor, /const previousAttributes = editor\.getAttributes\('link'\)/);
  assert.match(richEditor, /const previousUrl = previousAttributes\.href/);
  assert.match(richEditor, /prompt\(editingExistingLink \? 'Sửa URL:' : 'Nhập URL:', previousUrl\)/);
  assert.match(richEditor, /if \(url === null\) return/);
  assert.match(richEditor, /chain\.unsetLink\(\)\.run\(\)/);
  assert.match(richEditor, /chain\.setLink\(linkAttributes\)\.run\(\)/);
  assert.match(richEditor, /className=\{editor\.isActive\('link'\) \? 'is-active' : ''\}/);
  assert.match(richEditor, /title=\{editor\.isActive\('link'\) \? 'Sửa link' : 'Thêm link'\}/);
});

test('existing media selection exposes single-item metadata editing only', () => {
  assert.match(picker, /selectedAlt/);
  assert.match(picker, /selectedCaption/);
  assert.match(picker, /selectedMultiple\.size === 1/);
  assert.match(picker, /hydrateSelectedMetadata/);
  assert.match(picker, /adminApi\.updateMedia\(token, selectedItem\.id/);
  assert.match(picker, /alt,\s*caption: caption \|\| null/);
  assert.match(picker, /setMedia\(prev => prev\.map\(item => item\.id === selectedItem\.id/);
  assert.match(picker, /data-testid="media-existing-alt"/);
  assert.match(picker, /data-testid="media-existing-caption"/);
  assert.match(picker, /data-testid="media-existing-metadata-save"/);
  assert.match(picker, /Vui lòng nhập Alt ảnh/);
  assert.match(picker, /Chọn một ảnh để chỉnh ALT và chú thích/);
  assert.match(picker, /Đã lưu ALT và chú thích ảnh/);
  assert.match(picker, /onSelect\(selected, media\.find\(item => item\.url === selected\)\)/);
});

test('thumbnail and editor consumers receive the selected item metadata', () => {
  assert.match(articleEditor, /thumbnail_alt: item\?\.alt/);
  assert.match(articleEditor, /thumbnail_caption: item\?\.caption/);
  assert.match(articleEditor, /item\?\.alt \|\| form\.title/);
  assert.match(articleEditor, /item\?\.caption \|\| ''/);
  assert.match(productEditor, /thumbnail_alt: item\?\.alt/);
  assert.match(productEditor, /thumbnail_caption: item\?\.caption/);
  assert.match(productEditor, /item\?\.alt \|\| form\.name/);
  assert.match(productEditor, /item\?\.caption \|\| ''/);
});

test('admin media metadata uses the existing PUT endpoint and preserves binary fields', () => {
  assert.match(apiSource, /updateMedia: \(token: string, id: number/);
  assert.match(apiSource, /fetchApi\(`\/media\/\$\{id\}`, \{ method: "PUT"/);
  assert.match(imageSeoMetadataTest, /test_media_metadata_update_does_not_change_binary_fields/);
  assert.match(imageSeoMetadataTest, /\$binaryFields = \[/);
  assert.match(imageSeoMetadataTest, /\$this->assertSame\(\$originalBinary, \$media->only\(\$binaryFields\)\)/);
});

test('rich editor toolbar remains available while scrolling long content', () => {
  assert.match(editorStyles, /\.tiptap-toolbar\s*\{[\s\S]*position:\s*sticky/);
  assert.match(editorStyles, /\.admin-layout\s*\{[\s\S]*--admin-topbar-height:\s*72px/);
  assert.match(editorStyles, /\.tiptap-toolbar\s*\{[\s\S]*top:\s*var\(--admin-topbar-height\)/);
  assert.match(editorStyles, /\.tiptap-editor\s*\{[\s\S]*overflow:\s*visible/);
  assert.match(globalStyles, /html\s*\{[\s\S]*overflow-x:\s*clip/);
  assert.match(globalStyles, /body\s*\{[\s\S]*overflow-x:\s*clip/);
});
