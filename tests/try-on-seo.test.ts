import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');
const page = read('src/app/(public)/thu-kinh-ao/page.tsx');
const client = read('src/app/(public)/thu-kinh-ao/VirtualTryOnClient.tsx');
const tryOnStyles = read('src/app/(public)/thu-kinh-ao/try-on.css');
const productDetail = read('src/app/(public)/san-pham/[slug]/ProductDetailClient.tsx');
const sitemap = read('src/app/sitemap.ts');

test('try-on landing exposes the approved metadata, H1 and canonical', () => {
  assert.match(page, /const PAGE_TITLE = 'Thử Kính Online Bằng AI Trên Khuôn Mặt \| MITOO'/);
  assert.match(page, /title:\s*\{ absolute: PAGE_TITLE \}/);
  assert.match(page, /const PAGE_DESCRIPTION = 'Thử kính online miễn phí với MITOO:/);
  assert.match(page, /description:\s*PAGE_DESCRIPTION/);
  assert.match(page, /canonical:\s*'\/thu-kinh-ao'/);
  assert.match(client, /Thử Kính Online\s*<em>Bằng AI Trên Khuôn Mặt<\/em>/);
  assert.match(client, /Không cần đến cửa hàng để thử từng mẫu kính/);
  assert.match(client, /Thử kính ngay/);
  assert.match(client, /Xem gọng kính/);
});

test('try-on landing server-renders indexable sections and matching FAQ schema', () => {
  for (const heading of [
    'Thử kính online tại MITOO hoạt động như thế nào?',
    'Vì sao nên thử kính online trước khi chọn gọng?',
    'Bạn có thể thử những kiểu gọng kính nào?',
    'Chọn kính theo dáng khuôn mặt',
    'Câu hỏi thường gặp về thử kính online',
  ]) {
    assert.match(page, new RegExp(heading));
  }
  assert.match(page, /'@type': 'FAQPage'/);
  assert.match(page, /dangerouslySetInnerHTML/);
  assert.equal((page.match(/<details key={item\.question}>/g) || []).length, 1);
  assert.match(page, /Khám phá các kiểu gọng theo dáng kính, sau đó chọn mẫu bạn thích để thử bằng AI trên khuôn mặt\./);
  assert.doesNotMatch(page, /realtime AR|AR tracking realtime|chính xác 100%|đảm bảo vừa mặt/);
});

test('TRYON_CATEGORY_LINKS_VERIFIED: frame-shape routes are live and lens category is excluded', () => {
  for (const href of [
    '/danh-muc/gong-kinh-vuong',
    '/danh-muc/gong-kinh-tron',
    '/danh-muc/gong-kinh-mat-meo',
    '/danh-muc/gong-kinh-panto',
    '/danh-muc/gong-kinh-da-giac',
  ]) {
    assert.match(page, new RegExp(`href: '${href.replaceAll('/', '\\/')}'`));
  }
  assert.doesNotMatch(page, /\/danh-muc\/trong-kinh/);
  assert.equal((page.match(/href: '\/danh-muc\/gong-kinh-(?:vuong|tron|mat-meo|panto|da-giac)'/g) || []).length, 5);
});

test('TRYON_CATEGORY_404_LINKS=0 and LENS_CATEGORY_REMOVED', () => {
  assert.doesNotMatch(page, /\/danh-muc\/trong-kinh/);
  assert.doesNotMatch(page, /Kính cận|Kính râm|Kính thời trang/);
});

test('try-on product discovery and product detail use crawlable canonical links', () => {
  assert.match(client, /<Link className="tryon-product-card__detail-link" href={`\/san-pham\/\$\{encodeURIComponent\(product\.slug\)\}`}/);
  assert.match(client, /Xem chi tiết sản phẩm/);
  assert.match(client, /processTryOn/);
  assert.match(client, /publicApi\.aiTryOn/);
  assert.match(client, /Tải ảnh khuôn mặt/);
  assert.match(client, /Chụp ảnh từ Camera/);
  assert.match(productDetail, /<Link className="product-info__tryon-link" href="\/thu-kinh-ao">/);
  assert.match(productDetail, /Thử thêm nhiều gọng kính online/);
});

test('try-on sitemap entry remains one clean canonical URL', () => {
  assert.match(sitemap, /\$\{APP_URL\}\/thu-kinh-ao/);
  assert.equal((sitemap.match(/\$\{APP_URL\}\/thu-kinh-ao/g) || []).length, 1);
  assert.match(sitemap, /dynamic = 'force-dynamic'/);
  assert.match(sitemap, /revalidate = 0/);
  assert.match(sitemap, /cache: 'no-store'/);
  assert.doesNotMatch(sitemap, /thu-kinh-ao\?[^'"` ]+/);
});

test('try-on sources keep clean Vietnamese UTF-8 text', () => {
  for (const source of [page, client, tryOnStyles, productDetail]) {
    assert.doesNotMatch(source, /[ÃÂ�]/, 'unexpected mojibake in try-on sources');
  }
});
