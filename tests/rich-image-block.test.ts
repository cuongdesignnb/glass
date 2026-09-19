import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');
const extension = read('src/components/admin/RichImageExtension.ts');
const nodeView = read('src/components/admin/RichImageNodeView.tsx');
const editor = read('src/components/admin/RichEditor.tsx');
const adminStyles = read('src/app/admin/admin.css');
const articleStyles = read('src/app/(public)/bai-viet/articles.css');
const articlePage = read('src/app/(public)/bai-viet/[slug]/page.tsx');

test('rich image block supports legacy images and semantic figure output', () => {
  assert.match(extension, /name:\s*'richImage'/);
  assert.match(extension, /src:\s*\{\s*default:\s*''\s*\}/);
  assert.match(extension, /alt:\s*\{\s*default:\s*''\s*\}/);
  assert.match(extension, /caption:\s*\{\s*default:\s*''\s*\}/);
  assert.match(extension, /align:\s*\{\s*\n?\s*default:\s*'center'/);
  assert.match(extension, /tag:\s*'figure\[data-type="rich-image"\]'/);
  assert.match(extension, /tag:\s*'figure\.article-image'/);
  assert.match(extension, /tag:\s*'img'/);
  assert.match(extension, /legacyCaption\s*=\s*image\.getAttribute\('title'\)/);
  assert.match(extension, /caption:\s*figureCaption\s*\|\|\s*legacyCaption/);
  assert.match(extension, /class:\s*`article-image article-image--\$\{align\}`/);
  assert.match(extension, /'data-type':\s*'rich-image'/);
  assert.match(extension, /'data-align':\s*align/);
  assert.match(extension, /\['figcaption',\s*\{\},\s*caption\]/);
  assert.match(extension, /if\s*\(caption\)/);
});

test('image node view exposes contextual editing controls without media side effects', () => {
  for (const label of ['Căn trái', 'Căn giữa', 'Căn phải', 'Sửa ảnh', 'Thay ảnh', 'Xóa ảnh']) {
    assert.match(nodeView, new RegExp(label));
  }
  assert.match(nodeView, /selected\s*\?\s*' is-selected'/);
  assert.match(nodeView, /value=\{alt\}/);
  assert.match(nodeView, /value=\{caption\}/);
  assert.match(nodeView, /Vui lòng nhập Alt ảnh/);
  assert.match(nodeView, /updateAttributes\('richImage'/);
  assert.match(nodeView, /const deleteImage = \(\) =>/);
  assert.match(nodeView, /const position = getPos\(\)/);
  assert.match(nodeView, /currentNode\.type\.name !== 'richImage'/);
  assert.match(nodeView, /tr\.delete\(position, position \+ currentNode\.nodeSize\)/);
  assert.match(nodeView, /extension\.options\.onReplace/);
  assert.match(editor, /tr\.setNodeMarkup\(position/);
  assert.doesNotMatch(nodeView, /DELETE\s+\/api\/media/);
  assert.doesNotMatch(editor, /deleteMedia|delete\(.*media/i);
});

test('edit panel keeps native input focus and restores saved attrs on cancel', () => {
  const panelHandler = nodeView.match(/function stopPanelMouseDown\([\s\S]*?\n}\n/);
  assert.ok(panelHandler, 'panel mouse handler should exist');
  assert.match(panelHandler[0], /event\.stopPropagation\(\)/);
  assert.doesNotMatch(panelHandler[0], /preventDefault/);
  assert.match(nodeView, /onMouseDown=\{stopPanelMouseDown\}/);
  assert.match(nodeView, /const openEditPanel = \(\) =>/);
  assert.match(nodeView, /setAlt\(String\(node\.attrs\.alt \|\| ''\)\)/);
  assert.match(nodeView, /setCaption\(String\(node\.attrs\.caption \|\| ''\)\)/);
  assert.match(nodeView, /onClick=\{openEditPanel\}/);
  assert.match(nodeView, /const cancelEdit = \(\) =>/);
  assert.match(nodeView, /onClick=\{cancelEdit\}/);
  assert.match(nodeView, /setError\(''\)/);

  const cancelHandler = nodeView.match(/const cancelEdit = \(\) => \{[\s\S]*?\n  \};/);
  assert.ok(cancelHandler, 'cancel handler should exist');
  assert.doesNotMatch(cancelHandler[0], /editor\.|updateAttributes|\.run\(\)/);
  assert.match(nodeView, /useEffect\(\(\) => \{[\s\S]*setAlt\(String\(node\.attrs\.alt/);
  assert.match(nodeView, /useEffect\(\(\) => \{[\s\S]*setCaption\(String\(node\.attrs\.caption/);
});

test('new inserts and replacements reuse MediaPicker metadata at the same node', () => {
  assert.match(editor, /onMediaPick\(insertRichImage\)/);
  assert.match(editor, /type:\s*'richImage'/);
  assert.match(editor, /caption:\s*\(caption \|\| ''\)\.trim\(\)/);
  assert.match(editor, /currentNode\.type\.name !== 'richImage'/);
  assert.match(editor, /src:\s*url/);
  assert.match(editor, /alt:\s*nextAlt/);
});

test('admin and frontend styles render responsive captions and alignment', () => {
  for (const source of [adminStyles, articleStyles]) {
    assert.match(source, /figure\.article-image/);
    assert.match(source, /figure\.article-image img/);
    assert.match(source, /figure\.article-image figcaption/);
    assert.match(source, /article-image--left/);
    assert.match(source, /article-image--center/);
    assert.match(source, /article-image--right/);
    assert.match(source, /max-width:\s*100%/);
    assert.match(source, /height:\s*auto/);
  }
  assert.match(articleStyles, /\.article-content figure\.article-image figcaption/);
  assert.match(adminStyles, /\.rich-image-context-toolbar/);
  assert.match(adminStyles, /\.rich-image-edit-panel/);
});

test('article alt fallback remains active for legacy images nested in figures', () => {
  assert.match(articlePage, /function injectMissingImageAlts/);
  assert.match(articlePage, /<img\\b\(\[\^>\]\*\)>/);
  assert.match(articlePage, /articleTitle/);
  assert.match(articlePage, /injectMissingImageAlts\(injectHeadingIds\(article\.content\)/);
});

test('Vietnamese labels and normal article save path remain covered', () => {
  assert.match(nodeView, /Thử|ALT ảnh|Chú thích ảnh/);
  assert.match(editor, /onChange\(editor\.getHTML\(\)\)/);
  assert.match(editor, /RichImage\.configure/);
  assert.match(editor, /EditorialLink\.configure\([\s\S]*openOnClick: false/);
});
