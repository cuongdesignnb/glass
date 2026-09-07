import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('footer fallback links only point to live policy routes', () => {
  const footer = read('src/components/layout/Footer.tsx');

  assert.match(footer, /Chính Sách Vận Chuyển[\s\S]*\/chinh-sach-van-chuyen/);
  assert.match(footer, /Chính Sách Đổi Trả[\s\S]*\/quy-dinh-doi-tra/);
  assert.match(footer, /Chính Sách Bảo Mật[\s\S]*\/chinh-sach-bao-mat/);
  assert.doesNotMatch(footer, /\/huong-dan-mua-hang|\/chinh-sach-doi-tra|\/chinh-sach-bao-hanh|\/van-chuyen/);
});

test('footer does not render an unconfigured terms fallback', () => {
  const footer = read('src/components/layout/Footer.tsx');

  assert.match(footer, /footer_terms_url[\s\S]*trim\(\)/);
  assert.doesNotMatch(footer, /\/dieu-khoan-su-dung/);
});

test('contact page is settings-backed and has a canonical H1 route', () => {
  const contact = read('src/app/(public)/lien-he/page.tsx');

  assert.match(contact, /getPublicSettings/);
  assert.match(contact, /url:\s*['"]\/lien-he['"]/);
  assert.match(contact, /<h1[\s\S]*heading/);
  assert.match(contact, /contact_phone/);
  assert.match(contact, /contact_email/);
  assert.match(contact, /contact_address/);
  assert.match(contact, /footer_opening_hours/);
  assert.doesNotMatch(contact, /0123456789|info@glass\.vn|Địa chỉ giả/);
});

test('homepage voucher section exposes a crawlable internal destination', () => {
  const homepage = read('src/app/(public)/HomeClient.tsx');

  assert.match(homepage, /<Link href="\/voucher"/);
  assert.match(homepage, /Xem tất cả mã giảm giá/);
});

test('sitemap discovers CMS pages, contact, and deduplicates URLs', () => {
  const sitemap = read('src/app/sitemap.ts');

  assert.match(sitemap, /fetchAll<any>\('\/public\/pages'\)/);
  assert.match(sitemap, /const cmsPageUrls/);
  assert.match(sitemap, /\/lien-he/);
  assert.match(sitemap, /dedupeSitemapEntries\(/);
  assert.match(sitemap, /updated_at/);
  assert.doesNotMatch(sitemap, /\/san-pham\?category=|\/san-pham\?page=/);
});

test('llms.txt only advertises live policy routes', () => {
  const llms = read('public/llms.txt');

  assert.match(llms, /https:\/\/mitoo\.vn\/lien-he/);
  assert.match(llms, /https:\/\/mitoo\.vn\/quy-dinh-doi-tra/);
  assert.match(llms, /https:\/\/mitoo\.vn\/chinh-sach-van-chuyen/);
  assert.match(llms, /https:\/\/mitoo\.vn\/chinh-sach-bao-mat/);
  assert.doesNotMatch(llms, /\/huong-dan-mua-hang|\/chinh-sach-doi-tra|\/chinh-sach-bao-hanh|\/van-chuyen|\/dieu-khoan-su-dung/);
});
