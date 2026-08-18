import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const settingsLoader = readFileSync('src/lib/settings.ts', 'utf8');
const publicLayout = readFileSync('src/app/(public)/layout.tsx', 'utf8');
const publicApi = readFileSync('src/lib/api.ts', 'utf8');

test('public settings bypass persistent Next data cache and share the server loader', () => {
  assert.match(settingsLoader, /cache:\s*['"]no-store['"]/);
  assert.doesNotMatch(settingsLoader, /next:\s*\{\s*revalidate\s*:/);
  assert.match(settingsLoader, /export const getPublicSettings = cache\(/);

  assert.match(publicLayout, /getPublicSettings\(\)/);
  assert.doesNotMatch(publicLayout, /publicApi\.getSettings/);

  assert.match(publicApi, /getSettings: \(group\?: string\) =>[\s\S]*cache: "no-store"/);
});
