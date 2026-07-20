import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const baseUrl = readArg('base-url', 'http://localhost:3101').replace(/\/$/, '');
const productSlug = readArg(
  'product-slug',
  'gong-kinh-nu-mat-meo-tr98025-sieu-nhe-gong-kinh-thoi-trang-han-quoc-cao-cap',
);
const port = Number(readArg('debug-port', '9335'));
const chromePath = process.env.PERF_CHROME_PATH || (
  process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : undefined
);

if (!chromePath) throw new Error('Set PERF_CHROME_PATH to Chrome or Chromium');

const screenshotDirectory = resolve('.audit-evidence', 'performance', 'after', 'screenshots');
const summaryDirectory = resolve('artifacts', 'performance', 'summary');
mkdirSync(screenshotDirectory, { recursive: true });
mkdirSync(summaryDirectory, { recursive: true });

function createCdpSession(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  const pending = new Map();
  const listeners = new Map();
  let nextId = 1;

  const opened = new Promise((resolvePromise, reject) => {
    socket.addEventListener('open', resolvePromise, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve: resolvePromise, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolvePromise(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) || []) {
      listener(message.params || {});
    }
  });

  return {
    async send(method, params = {}) {
      await opened;
      const id = nextId;
      nextId += 1;
      const result = new Promise((resolvePromise, reject) => {
        pending.set(id, { resolve: resolvePromise, reject });
      });
      socket.send(JSON.stringify({ id, method, params }));
      return result;
    },
    on(method, listener) {
      if (!listeners.has(method)) listeners.set(method, []);
      listeners.get(method).push(listener);
    },
    async close() {
      await opened;
      socket.close();
    },
  };
}

async function waitForChrome() {
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

async function waitForNetworkIdle(activeRequests, timeoutMs = 15000) {
  const startedAt = Date.now();
  let idleSince = null;
  while (Date.now() - startedAt < timeoutMs) {
    if (activeRequests.size === 0) {
      if (idleSince === null) idleSince = Date.now();
      if (Date.now() - idleSince >= 750) return true;
    } else {
      idleSince = null;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  return false;
}

async function openPage(pathname, screenshotName) {
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: 'PUT',
  }).then((response) => response.json());
  const cdp = createCdpSession(target.webSocketDebuggerUrl);
  const activeRequests = new Set();
  const consoleErrors = [];

  cdp.on('Network.requestWillBeSent', ({ requestId }) => activeRequests.add(requestId));
  cdp.on('Network.loadingFinished', ({ requestId }) => activeRequests.delete(requestId));
  cdp.on('Network.loadingFailed', ({ requestId, errorText, canceled }) => {
    activeRequests.delete(requestId);
    if (!canceled) consoleErrors.push(`Network: ${errorText}`);
  });
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    const description = exceptionDetails?.exception?.description || exceptionDetails?.text || 'Runtime exception';
    const frames = (exceptionDetails?.stackTrace?.callFrames || [])
      .slice(0, 4)
      .map((frame) => `${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber + 1})`)
      .join(' <- ');
    consoleErrors.push(frames ? `${description}\n${frames}` : description);
  });
  cdp.on('Log.entryAdded', ({ entry }) => {
    if (entry?.level === 'error') consoleErrors.push(`Console: ${entry.text}`);
  });

  await Promise.all([
    cdp.send('Page.enable'),
    cdp.send('Runtime.enable'),
    cdp.send('Network.enable'),
    cdp.send('Log.enable'),
  ]);
  await cdp.send('Page.navigate', { url: `${baseUrl}${pathname}` });
  const networkIdle = await waitForNetworkIdle(activeRequests);

  const evaluate = async (expression) => {
    const result = await cdp.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };

  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  writeFileSync(
    resolve(screenshotDirectory, `${screenshotName}.png`),
    Buffer.from(screenshot.data, 'base64'),
  );

  return { cdp, evaluate, activeRequests, consoleErrors, networkIdle, target };
}

const profileDirectory = resolve('.audit-evidence', `chrome-smoke-${process.pid}`);
mkdirSync(profileDirectory, { recursive: true });
const chromeProcess = spawn(
  chromePath,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDirectory}`,
    '--no-first-run',
    '--disable-default-apps',
    '--no-sandbox',
    '--window-size=1440,1000',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const results = {};
let browserVersion;

function isExpectedEnvironmentError(message) {
  return [
    'https://sp.zalo.me/plugins/sdk.js',
    "Access to font at 'https://mitoo.vn/api/public/font-file",
    'Network: net::ERR_FAILED',
    'Network: net::ERR_BLOCKED_BY_ORB',
    'Console: Failed to load resource: net::ERR_FAILED',
  ].some((fragment) => message.includes(fragment));
}

try {
  browserVersion = await waitForChrome();

  const home = await openPage('/', 'home');
  results.home = await home.evaluate(`(async () => ({
    title: document.title,
    bodyTextLength: document.body.innerText.trim().length,
    errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], #webpack-dev-server-client-overlay')),
    newsletterCount: document.querySelectorAll('.newsletter').length,
    newsletterPlaceholders: Array.from(document.querySelectorAll('.newsletter input')).map((input) => input.placeholder),
    serviceWorkerRegistrations: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0,
    legacyCaches: 'caches' in window ? (await caches.keys()).filter((name) => name.startsWith('glass-eyewear-') || name.startsWith('mitoo-store-')) : [],
  }))()`);
  results.home.consoleErrors = home.consoleErrors;
  results.home.networkIdle = home.networkIdle;
  await home.cdp.close();

  const product = await openPage(`/san-pham/${productSlug}`, 'product-detail-before-click');
  const beforeResources = await product.evaluate(`performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((name) => name.includes('/_next/static/chunks/') && name.endsWith('.js'))`);
  const beforeState = await product.evaluate(`(() => ({
    title: document.title,
    bodyTextLength: document.body.innerText.trim().length,
    errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], #webpack-dev-server-client-overlay')),
    newsletterCount: document.querySelectorAll('.newsletter').length,
    modalVisible: Boolean(document.querySelector('.tryon-modal')),
    tryOnButton: Array.from(document.querySelectorAll('button')).some((button) => button.textContent.includes('Đeo thử kính')),
  }))()`);
  const clicked = await product.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((item) => item.textContent.includes('Đeo thử kính'));
    if (!button) return false;
    button.click();
    return true;
  })()`);
  await waitForNetworkIdle(product.activeRequests);
  const afterResources = await product.evaluate(`performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((name) => name.includes('/_next/static/chunks/') && name.endsWith('.js'))`);
  const afterState = await product.evaluate(`(() => ({
    modalVisible: Boolean(document.querySelector('.tryon-modal')),
    closeButtonVisible: Boolean(document.querySelector('.tryon-modal__close')),
    activeElement: document.activeElement?.className || document.activeElement?.tagName,
  }))()`);
  const afterScreenshot = await product.cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  writeFileSync(
    resolve(screenshotDirectory, 'product-detail-after-click.png'),
    Buffer.from(afterScreenshot.data, 'base64'),
  );
  await product.cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
  });
  await product.cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
  });
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  const modalClosedWithEscape = await product.evaluate(
    `!document.querySelector('.tryon-modal')`,
  );
  results.productDetail = {
    ...beforeState,
    clicked,
    ...afterState,
    initialScriptCount: beforeResources.length,
    scriptsLoadedAfterClick: afterResources.filter((name) => !beforeResources.includes(name)),
    consoleErrors: product.consoleErrors,
    modalClosedWithEscape,
    networkIdleBeforeClick: product.networkIdle,
  };
  await product.cdp.close();

  results.home.unexpectedErrors = results.home.consoleErrors.filter(
    (message) => !isExpectedEnvironmentError(message),
  );
  results.productDetail.unexpectedErrors = results.productDetail.consoleErrors.filter(
    (message) => !isExpectedEnvironmentError(message),
  );

  const failures = [];
  if (results.home.bodyTextLength === 0) failures.push('home is blank');
  if (results.home.errorOverlay) failures.push('home has a Next.js error overlay');
  if (results.home.newsletterCount !== 1) failures.push('home newsletter count is not 1');
  if (results.home.serviceWorkerRegistrations !== 0) failures.push('service worker still registered');
  if (results.home.legacyCaches.length !== 0) failures.push('legacy caches remain');
  if (results.home.unexpectedErrors.length !== 0) failures.push('home has unexpected application errors');
  if (!results.productDetail.tryOnButton) failures.push('TryOn button is missing');
  if (results.productDetail.modalVisible !== true) failures.push('TryOn modal did not open');
  if (!String(results.productDetail.activeElement).includes('tryon-modal__close')) failures.push('TryOn modal did not receive keyboard focus');
  if (!results.productDetail.modalClosedWithEscape) failures.push('TryOn modal did not close with Escape');
  if (results.productDetail.scriptsLoadedAfterClick.length === 0) failures.push('no lazy script loaded after TryOn click');
  if (results.productDetail.unexpectedErrors.length !== 0) failures.push('product detail has unexpected application errors');

  const output = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    browser: browserVersion.Browser,
    pass: failures.length === 0,
    failures,
    results,
  };
  writeFileSync(
    resolve(summaryDirectory, 'browser-smoke.json'),
    `${JSON.stringify(output, null, 2)}\n`,
  );
  console.log(JSON.stringify(output, null, 2));
  if (failures.length > 0) process.exitCode = 1;
} finally {
  try {
    const browser = createCdpSession(browserVersion?.webSocketDebuggerUrl);
    await browser.send('Browser.close');
    await browser.close();
  } catch {
    chromeProcess.kill();
  }
}
