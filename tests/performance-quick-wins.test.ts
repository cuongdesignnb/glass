import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  cartItemIdentity,
  mergeCartItem,
  parseStoredCart,
  type StoredCartItem,
} from '../src/lib/cart-storage.ts';
import { shouldRenderLayoutNewsletter } from '../src/components/layout/newsletter-visibility.ts';

const read = (path: string) => readFileSync(path, 'utf8');

test('homepage keeps its dedicated newsletter while the public layout skips its default slot', () => {
  assert.equal(shouldRenderLayoutNewsletter('/'), false);
  assert.equal(shouldRenderLayoutNewsletter('/san-pham'), true);

  const homepage = read('src/app/(public)/page.tsx');
  const publicLayout = read('src/app/(public)/layout.tsx');
  assert.equal((homepage.match(/<Newsletter\s*\/>/g) || []).length, 1);
  assert.equal((publicLayout.match(/<NewsletterSlot\s*\/>/g) || []).length, 1);
  assert.doesNotMatch(publicLayout, /<Newsletter\s*\/>/);
});

test('newsletter uses a static placeholder and no continuous React timer', () => {
  const newsletter = read('src/components/layout/Newsletter.tsx');
  assert.match(newsletter, /placeholder="Nhập địa chỉ email của bạn"/);
  assert.doesNotMatch(newsletter, /setTimeout|setInterval|PLACEHOLDER_TEXTS/);
});

test('header reads cart count from CartProvider without duplicate listeners', () => {
  const header = read('src/components/layout/Header.tsx');
  assert.match(header, /totalItems:\s*cartCount/);
  assert.doesNotMatch(header, /cart-updated|glass_cart|localStorage/);
});

const baseCartItem: StoredCartItem = {
  productId: 10,
  name: 'Test frame',
  slug: 'test-frame',
  image: '/test.jpg',
  price: 100,
  salePrice: null,
  quantity: 1,
  color: '#000000',
  colorName: 'Black',
  addons: [],
};

test('cart identity merges only equal product, color, and addon sets', () => {
  const lens = { groupName: 'Lens', optionName: 'Blue light', price: 20 };
  const caseAddon = { groupName: 'Case', optionName: 'Hard case', price: 10 };
  const withAddons = { ...baseCartItem, addons: [lens, caseAddon] };
  const sameSetDifferentOrder = { ...baseCartItem, quantity: 2, addons: [caseAddon, lens] };

  const merged = mergeCartItem([withAddons], sameSetDifferentOrder);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].quantity, 3);
  assert.equal(cartItemIdentity(withAddons), cartItemIdentity(sameSetDifferentOrder));

  assert.equal(mergeCartItem([withAddons], { ...baseCartItem, addons: [lens] }).length, 2);
  assert.equal(mergeCartItem([withAddons], { ...withAddons, color: '#ffffff' }).length, 2);
  assert.equal(mergeCartItem([baseCartItem], { ...baseCartItem, quantity: 2 }).length, 1);
});

test('legacy cart persistence remains readable and malformed data is harmless', () => {
  const legacyItem = { ...baseCartItem };
  delete legacyItem.addons;

  assert.deepEqual(parseStoredCart(JSON.stringify([legacyItem])), [legacyItem]);
  assert.deepEqual(parseStoredCart('{broken'), []);
  assert.deepEqual(parseStoredCart(JSON.stringify({ items: [legacyItem] })), []);
});

test('cart provider owns cross-tab updates and line-specific cart actions', () => {
  const cartProvider = read('src/lib/useCart.tsx');
  const cartPage = read('src/app/(public)/gio-hang/CartClient.tsx');
  const productDetail = read('src/app/(public)/san-pham/[slug]/ProductDetailClient.tsx');

  assert.match(cartProvider, /addEventListener\(['"]storage['"]/);
  assert.match(cartProvider, /cartItemIdentity/);
  assert.match(cartPage, /updateQuantity\([^\n]+item\.addons/);
  assert.match(cartPage, /removeItem\([^\n]+item\.addons/);
  assert.match(productDetail, /const\s*\{\s*addItem\s*\}\s*=\s*useCart\(\)/);
  assert.match(productDetail, /addItem\(cartItem\)/);
});

test('TryOn is dynamically imported and mounted only after the user opens it', () => {
  const productDetail = read(
    'src/app/(public)/san-pham/[slug]/ProductDetailClient.tsx',
  );
  assert.match(productDetail, /dynamic\([\s\S]*TryOnModal[\s\S]*ssr:\s*false/);
  assert.match(productDetail, /showTryOn\s*&&\s*\([\s\S]*<TryOnModal/);
  assert.doesNotMatch(productDetail, /localStorage\.getItem\("glass_cart"\)/);

  const modal = read('src/components/layout/TryOnModal.tsx');
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /event\.key === "Escape"/);
  assert.match(modal, /closeButtonRef\.current\?\.focus\(\)/);
});

test('service worker migration unregisters legacy caches and has no fetch handler', () => {
  const serviceWorker = read('public/sw.js');
  const rootLayout = read('src/app/layout.tsx');
  assert.match(serviceWorker, /registration\.unregister\(\)/);
  assert.doesNotMatch(serviceWorker, /addEventListener\(['"]fetch['"]/);
  assert.match(rootLayout, /getRegistrations\(\)/);
  assert.match(rootLayout, /mitoo-sw-retirement-v1/);
  assert.match(rootLayout, /new URL\(worker\.scriptURL\)\.pathname === '\/sw\.js'/);
  assert.match(rootLayout, /glass-eyewear-/);
  assert.match(rootLayout, /mitoo-store-/);
  assert.match(rootLayout, /Promise\.allSettled/);
  assert.doesNotMatch(rootLayout, /serviceWorker\.register\(/);
  assert.doesNotMatch(rootLayout, /localStorage\.(?:clear|removeItem)/);
  assert.doesNotMatch(rootLayout, /glass_cart|glass_token|admin_token/);
});
