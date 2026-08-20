import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');

test('sitemap always loads fresh public data without persistent Next Data Cache', () => {
  assert.match(sitemap, /export const dynamic = ['"]force-dynamic['"]/);
  assert.match(sitemap, /export const revalidate = 0/);
  assert.match(sitemap, /cache:\s*['"]no-store['"]/);
  assert.match(sitemap, /Cache-Control['"]\s*:\s*['"]no-cache['"]/);
  assert.doesNotMatch(sitemap, /next:\s*\{\s*revalidate\s*:\s*3600\s*\}/);
});

test('sitemap keeps clean category, collection, product and article entries', () => {
  assert.match(sitemap, /fetchAll<any>\('\/public\/categories\?tree=false'\)/);
  assert.match(sitemap, /fetchAll<any>\('\/public\/collections'\)/);
  assert.match(sitemap, /fetchAll<any>\('\/public\/products\?per_page=1000'\)/);
  assert.match(sitemap, /fetchAll<any>\('\/public\/articles\?per_page=1000&published_only=1'\)/);
  assert.match(sitemap, /`\$\{APP_URL\}\/danh-muc\/\$\{category\.slug\}`/);
  assert.match(sitemap, /`\$\{APP_URL\}\/bo-suu-tap\/\$\{collection\.slug\}`/);
  assert.match(sitemap, /`\$\{APP_URL\}\/san-pham\/\$\{product\.slug\}`/);
  assert.match(sitemap, /`\$\{APP_URL\}\/bai-viet\/\$\{article\.slug\}`/);
  assert.doesNotMatch(sitemap, /\/san-pham\?category=/);
  assert.doesNotMatch(sitemap, /\/san-pham\?page=/);
});
