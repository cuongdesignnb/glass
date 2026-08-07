import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { persistAdminSetting } from '../src/lib/admin-settings-persistence.ts';

const settingsPage = readFileSync('src/app/admin/settings/page.tsx', 'utf8');

test('settings UI routes upload, Media Library selection, and removal through favicon persistence', () => {
  assert.match(settingsPage, /await persistFavicon\(url, "Đã tải lên và gắn favicon mới"\)/);
  assert.match(settingsPage, /mediaTarget === "site_favicon"/);
  assert.match(settingsPage, /persistFavicon\("", "Đã xoá favicon"\)/);
  assert.match(settingsPage, /invalidateSettings/);
});

function clientFor(expectedValue: string) {
  const calls: string[] = [];
  return {
    calls,
    client: {
      updateSettings: async (settings: Array<{ key: string; value: string; group: string }>) => {
        calls.push(`PUT:${settings[0].key}:${settings[0].value}:${settings[0].group}`);
      },
      getSettings: async () => ({ general: { site_favicon: expectedValue } }),
    },
  };
}

test('direct favicon upload persists and verifies the saved URL', async () => {
  const expected = '/storage/uploads/favicon.ico';
  const { client, calls } = clientFor(expected);
  let invalidated = false;

  await persistAdminSetting(client, {
    key: 'site_favicon',
    value: expected,
    group: 'general',
  }, () => { invalidated = true; });

  assert.deepEqual(calls, [`PUT:site_favicon:${expected}:general`]);
  assert.equal(invalidated, true);
});

test('Media Library favicon selection uses the same durable persistence path', async () => {
  const expected = '/storage/uploads/library-favicon.ico';
  const { client, calls } = clientFor(expected);

  await persistAdminSetting(client, {
    key: 'site_favicon',
    value: expected,
    group: 'general',
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0], /^PUT:site_favicon:\/storage\/uploads\/library-favicon\.ico:general$/);
});

test('removing the favicon persists an empty value and verifies it', async () => {
  const calls: string[] = [];
  const client = {
    updateSettings: async (settings: Array<{ key: string; value: string; group: string }>) => {
      calls.push(`${settings[0].key}:${settings[0].value}:${settings[0].group}`);
    },
    getSettings: async () => ({ general: { site_favicon: '' } }),
  };

  await persistAdminSetting(client, {
    key: 'site_favicon',
    value: '',
    group: 'general',
  });

  assert.deepEqual(calls, ['site_favicon::general']);
});
