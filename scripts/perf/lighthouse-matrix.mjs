import { mkdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const baseUrl = readArg('base-url', 'https://mitoo.vn').replace(/\/$/, '');
const phase = readArg('phase', 'before');
const runs = Number(readArg('runs', '3'));
const requestedRoutes = new Set(readArg('routes', 'home,products,product-detail,articles,article-detail').split(','));
const requestedDevices = new Set(readArg('devices', 'desktop,mobile').split(','));
const cacheModes = readArg('cache-modes', 'cold,warm').split(',');
const productSlug = readArg(
  'product-slug',
  'gong-kinh-nu-mat-meo-tr98025-sieu-nhe-gong-kinh-thoi-trang-han-quoc-cao-cap',
);
const articleSlug = readArg(
  'article-slug',
  'mat-tron-deo-kinh-mat-meo-co-hop-khong-loi-khuyen-tu-chuyen-gia-chon-kinh',
);

if (!Number.isInteger(runs) || runs < 1) {
  throw new Error('--runs must be a positive integer');
}

for (const [label, value] of [
  ['phase', phase],
  ['product-slug', productSlug],
  ['article-slug', articleSlug],
]) {
  if (!/^[a-z0-9-]+$/i.test(value)) {
    throw new Error(`--${label} contains unsupported characters`);
  }
}

const parsedBaseUrl = new URL(baseUrl);
if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) {
  throw new Error('--base-url must use http or https');
}

const routes = [
  ['home', '/'],
  ['products', '/san-pham'],
  ['product-detail', `/san-pham/${productSlug}`],
  ['articles', '/bai-viet'],
  ['article-detail', `/bai-viet/${articleSlug}`],
].filter(([name]) => requestedRoutes.has(name));

const devices = [
  ['desktop', 9331, ['--preset=desktop']],
  [
    'mobile',
    9332,
    [
      '--form-factor=mobile',
      '--screenEmulation.mobile=true',
      '--throttling-method=simulate',
    ],
  ],
].filter(([name]) => requestedDevices.has(name));

if (routes.length === 0 || devices.length === 0 || cacheModes.some((mode) => !['cold', 'warm'].includes(mode))) {
  throw new Error('Select valid --routes, --devices, and --cache-modes values');
}

const outputDirectory = resolve('.audit-evidence', 'performance', phase);
mkdirSync(outputDirectory, { recursive: true });

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const defaultChrome = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : undefined;
const chromePath = process.env.PERF_CHROME_PATH || defaultChrome;

if (!chromePath) {
  throw new Error('Set PERF_CHROME_PATH to a Chrome or Chromium executable');
}

async function waitForChrome(port) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return response.json();
    } catch {
      // Chrome has not opened the debugging endpoint yet.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw new Error(`Chrome did not open debugging port ${port}`);
}

async function closeChrome(port, chromeProcess) {
  try {
    const version = await fetch(`http://127.0.0.1:${port}/json/version`).then(
      (response) => response.json(),
    );
    await new Promise((resolvePromise) => {
      const socket = new WebSocket(version.webSocketDebuggerUrl);
      const finish = () => resolvePromise();
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
        setTimeout(finish, 500);
      });
      socket.addEventListener('error', finish);
      socket.addEventListener('close', finish);
    });
  } catch {
    chromeProcess.kill();
  }
}

for (const [device, port, deviceFlags] of devices) {
  const profileDirectory = resolve(
    '.audit-evidence',
    `chrome-lighthouse-${phase}-${device}-${process.pid}`,
  );
  mkdirSync(profileDirectory, { recursive: true });

  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (response.ok) throw new Error(`Debugging port ${port} is already in use`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already in use')) throw error;
  }

  const chromeProcess = spawn(
    chromePath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDirectory}`,
      '--no-first-run',
      '--disable-default-apps',
      '--no-sandbox',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  await waitForChrome(port);

  try {
    for (const [routeName, pathname] of routes) {
      for (const cacheMode of cacheModes) {
        for (let run = 1; run <= runs; run += 1) {
          const outputPath = resolve(
            outputDirectory,
            `${routeName}-${device}-${cacheMode}-${run}.json`,
          );
          const lighthouseArgs = [
            '--yes',
            'lighthouse@12.8.2',
            `${baseUrl}${pathname}`,
            `--port=${port}`,
            '--only-categories=performance',
            '--output=json',
            `--output-path=${outputPath}`,
            '--blocked-url-patterns=*sw.js*',
            '--max-wait-for-load=45000',
            '--quiet',
            ...deviceFlags,
          ];

          if (cacheMode === 'warm') lighthouseArgs.push('--disable-storage-reset');
          if (cacheMode === 'cold' && run === 1) lighthouseArgs.push('--save-assets');

          console.log(
            `[lighthouse] ${routeName} ${device} ${cacheMode} run ${run}/${runs}`,
          );
          const result = spawnSync(npxCommand, lighthouseArgs, {
            cwd: process.cwd(),
            env: process.env,
            shell: process.platform === 'win32',
            stdio: 'inherit',
          });

          if (result.status !== 0) {
            throw new Error(
              `Lighthouse failed for ${routeName} ${device} ${cacheMode} run ${run}: ${result.error?.message || `exit ${result.status}`}`,
            );
          }
        }
      }
    }
  } finally {
    await closeChrome(port, chromeProcess);
  }
}

console.log(`[lighthouse] raw artifacts: ${outputDirectory}`);
