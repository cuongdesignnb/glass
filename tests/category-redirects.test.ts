import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import loadedNextConfig from '../next.config.js';

const nextConfigSource = readFileSync('next.config.js', 'utf8');

type RedirectRule = {
  source: string;
  destination: string;
  permanent: boolean;
};

const loadRedirectRules = async (): Promise<RedirectRule[]> => {
  if (typeof loadedNextConfig.redirects !== 'function') {
    throw new Error('next.config.js must expose redirects()');
  }

  return loadedNextConfig.redirects() as Promise<RedirectRule[]>;
};

test('legacy category paths use exact permanent redirects to clean category URLs', async () => {
  const redirectRules = await loadRedirectRules();
  assert.equal(redirectRules.length, 2);
  assert.deepEqual(redirectRules, [
    {
      source: '/gong-kinh',
      destination: '/danh-muc/gong-kinh',
      permanent: true,
    },
    {
      source: '/trong-kinh',
      destination: '/danh-muc/trong-kinh',
      permanent: true,
    },
  ]);
});

test('category redirects are exact path rules and preserve query strings', async () => {
  const redirectRules = await loadRedirectRules();
  assert.deepEqual(
    redirectRules.map((rule: { source: string }) => rule.source),
    ['/gong-kinh', '/trong-kinh'],
  );
  assert.equal(redirectRules.some((rule: { source: string }) => rule.source.includes(':')), false);

  // Next.js redirect rules keep the incoming query string when neither side
  // declares a query pattern or replacement.
  assert.doesNotMatch(nextConfigSource, /source:\s*['"][^'"]*\?/);
  assert.doesNotMatch(nextConfigSource, /destination:\s*['"][^'"]*\?/);
});

test('redirect destinations remain the existing category routes', async () => {
  const redirectRules = await loadRedirectRules();
  assert.deepEqual(
    redirectRules.map((rule: { destination: string }) => rule.destination),
    ['/danh-muc/gong-kinh', '/danh-muc/trong-kinh'],
  );
  assert.doesNotMatch(nextConfigSource, /destination:\s*['"](?:https?:)?\/\/[^'"]+/);
});
