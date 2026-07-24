import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('homepage collections use only managed records and real collection routes', () => {
  const homepage = read('src/app/(public)/page.tsx');
  const component = read('src/app/(public)/HomeCollections.tsx');

  assert.match(homepage, /publicApi\.getCollections\(\)/);
  assert.match(homepage, /<HomeCollections/);
  assert.doesNotMatch(homepage, /<DynamicCollections/);
  assert.doesNotMatch(component, /DEFAULT_COLLECTIONS|Thanh Lịch|Năng Động|\?style=/);
  assert.match(component, /\/bo-suu-tap\/\$\{encodeURIComponent\(collection\.slug\)\}/);
  assert.match(component, /collections\.length === 0/);
  assert.doesNotMatch(component, /publicApi\.getCollections|useEffect/);
});

test('collection routes expose managed products, metadata, schema and sitemap entries', () => {
  const directory = read('src/app/(public)/bo-suu-tap/page.tsx');
  const detail = read('src/app/(public)/bo-suu-tap/[slug]/page.tsx');
  const sitemap = read('src/app/sitemap.ts');
  const controller = read('backend/app/Http/Controllers/Api/CollectionController.php');

  assert.match(directory, /publicApi\.getCollections\(\)/);
  assert.match(detail, /publicApi\.getCollection\(slug\)/);
  assert.match(detail, /'@type': 'CollectionPage'/);
  assert.match(detail, /'@type': 'ItemList'/);
  assert.match(sitemap, /\/bo-suu-tap/);
  assert.match(sitemap, /\/public\/collections/);
  assert.match(controller, /where\('is_active', true\)/);
  assert.match(controller, /products\.is_active/);
  assert.match(controller, /product_ids\.\*.*exists:products,id/);
  assert.match(controller, /requireAdmin\(\)/);
});
