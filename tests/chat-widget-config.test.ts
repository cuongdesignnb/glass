import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  isChatWidgetEnabled,
  resolveChatIconUrl,
  resolveChatWidgetUrl,
} from '../src/lib/chat-widget.ts';
import { PUBLIC_SETTING_KEYS } from '../src/lib/settingsUtils.ts';

const widget = readFileSync('src/components/layout/ChatWidget.tsx', 'utf8');
const settingsPage = readFileSync('src/app/admin/settings/page.tsx', 'utf8');
const mediaPicker = readFileSync('src/components/admin/MediaPicker.tsx', 'utf8');
const settingsApi = readFileSync('backend/app/Http/Controllers/Api/SettingController.php', 'utf8');

test('direct Zalo and Messenger URLs are used exactly and take priority over legacy identifiers', () => {
  const settings = {
    chat_zalo_url: 'https://zalo.me/my-oa?from=mitoo&x=1',
    zalo_phone: '0901234567',
    zalo_oa_id: 'legacy-oa',
    chat_messenger_url: 'https://facebook.com/messages/t/my-page?ref=site',
    messenger_page_id: 'legacy-page',
  };

  assert.equal(resolveChatWidgetUrl('zalo', settings), settings.chat_zalo_url);
  assert.equal(resolveChatWidgetUrl('messenger', settings), settings.chat_messenger_url);
});

test('legacy phone, OA ID, and Messenger Page ID resolve only when a direct URL is absent', () => {
  assert.equal(resolveChatWidgetUrl('zalo', { zalo_phone: '090 123 4567' }), 'https://zalo.me/0901234567');
  assert.equal(resolveChatWidgetUrl('zalo', { zalo_oa_id: '12345' }), 'https://zalo.me/12345');
  assert.equal(resolveChatWidgetUrl('messenger', { messenger_page_id: 'mitoo.eyewear' }), 'https://m.me/mitoo.eyewear');
  assert.equal(resolveChatWidgetUrl('messenger', { chat_messenger_url: 'javascript:alert(1)', messenger_page_id: 'legacy-page' }), null);
});

test('dangerous and malformed web schemes fail closed in the resolver', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', '//evil.example/chat', 'https://user:pass@example.com/chat']) {
    assert.equal(resolveChatWidgetUrl('zalo', { chat_zalo_url: value, zalo_phone: '0901234567' }), null, value);
  }
  assert.equal(resolveChatWidgetUrl('zalo', { chat_zalo_url: 'https://zalo.me/mitoo' }), 'https://zalo.me/mitoo');
});

test('explicit off hides a widget; an unset flag preserves any configured channel', () => {
  const legacy = { zalo_phone: '0901234567' };
  const direct = { chat_messenger_url: 'https://m.me/mitoo' };

  assert.equal(isChatWidgetEnabled('zalo', legacy), true);
  assert.equal(isChatWidgetEnabled('messenger', direct), true);
  assert.equal(isChatWidgetEnabled('zalo', { ...legacy, chat_zalo_enabled: '0' }), false);
  assert.equal(isChatWidgetEnabled('messenger', { ...direct, chat_messenger_enabled: '1' }), true);
  assert.equal(isChatWidgetEnabled('messenger', { chat_messenger_enabled: '1' }), true);
});

test('custom media icons resolve safely and invalid schemes fall back to built-in icons', () => {
  assert.equal(resolveChatIconUrl('/storage/uploads/chat-icons/zalo.webp', 'https://mitoo.vn/api'), 'https://mitoo.vn/storage/uploads/chat-icons/zalo.webp');
  assert.equal(resolveChatIconUrl('javascript:alert(1)', 'https://mitoo.vn/api'), null);
  assert.equal(resolveChatIconUrl('https://cdn.example/zalo.svg', 'https://mitoo.vn/api'), 'https://cdn.example/zalo.svg');
  assert.match(widget, /function ZaloIcon\(/);
  assert.match(widget, /function MessengerIcon\(/);
});

test('Admin exposes both direct URLs, switches, custom icon controls, and the reusable upload/media picker', () => {
  for (const key of ['chat_zalo_enabled', 'chat_zalo_url', 'chat_zalo_icon', 'chat_messenger_enabled', 'chat_messenger_url', 'chat_messenger_icon']) {
    assert.ok(settingsPage.includes(key), `missing Admin setting ${key}`);
  }
  assert.match(settingsPage, /role="switch"/);
  assert.match(settingsPage, /Upload \/ chọn icon/);
  assert.match(settingsPage, /MediaPicker/);
  assert.match(settingsPage, /uploadFolder=.*chat-icons/);
  assert.match(mediaPicker, /uploadFolder = 'general'/);
  assert.match(mediaPicker, /formData\.append\('folder', uploadFolder\)/);
  assert.match(mediaPicker, /data-testid="media-picker-upload-alt"/);
});

test('all new public settings are allowlisted and current no-store/read-back save flow remains intact', () => {
  const keys = [
    'chat_zalo_enabled', 'chat_zalo_url', 'chat_zalo_icon',
    'chat_messenger_enabled', 'chat_messenger_url', 'chat_messenger_icon',
  ];
  for (const key of keys) {
    assert.ok(PUBLIC_SETTING_KEYS.has(key), `client public settings missing ${key}`);
    assert.ok(settingsApi.includes(`'${key}'`), `backend public settings missing ${key}`);
  }
  assert.match(settingsPage, /await adminApi\.updateSettings\(token, settingsArray\)/);
  assert.match(settingsPage, /flattenAdminSettings\(await adminApi\.getSettings\(token\)\)/);
  assert.match(settingsPage, /invalidateSettings\(\)/);
  assert.match(settingsApi, /'Cache-Control'\s*=>\s*'no-store, no-cache/);
});

test('floating controls are direct accessible links without the Zalo SDK or excess motion', () => {
  assert.match(widget, /href=\{zaloUrl\}/);
  assert.match(widget, /href=\{messengerUrl\}/);
  assert.equal((widget.match(/target="_blank"/g) || []).length, 2);
  assert.equal((widget.match(/rel="noopener noreferrer"/g) || []).length, 2);
  assert.match(widget, /aria-label="Chat qua Zalo"/);
  assert.match(widget, /aria-label="Chat qua Facebook Messenger"/);
  assert.doesNotMatch(widget, /sp\.zalo\.me\/plugins\/sdk\.js|data-oaid/);
  const styles = readFileSync('src/components/layout/ChatWidget.module.css', 'utf8');
  assert.match(styles, /env\(safe-area-inset-bottom/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(styles, /animation:\s*[^;]*infinite/);
});
