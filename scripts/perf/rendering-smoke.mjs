import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const baseUrl = readArg('base-url', 'http://127.0.0.1:3102').replace(/\/$/, '');
const port = Number(readArg('debug-port', '9337'));
const chromePath = process.env.PERF_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const summaryDirectory = resolve('artifacts', 'performance', 'summary', 'pr2a');
const screenshotDirectory = resolve('.audit-evidence', 'performance', 'after', 'pr2a', 'screenshots');
mkdirSync(summaryDirectory, { recursive: true });
mkdirSync(screenshotDirectory, { recursive: true });

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
      const operation = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) operation.reject(new Error(message.error.message));
      else operation.resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) || []) listener(message.params || {});
  });
  return {
    async send(method, params = {}) {
      await opened;
      const id = nextId++;
      const result = new Promise((resolvePromise, reject) => pending.set(id, { resolve: resolvePromise, reject }));
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
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw new Error('Chrome debugging endpoint did not open');
}

async function waitFor(predicate, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return true;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  return false;
}

async function openPage(pathname, { javaScriptDisabled = false, observeLayoutShifts = false } = {}) {
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
  const cdp = createCdpSession(target.webSocketDebuggerUrl);
  const requests = [];
  const errors = [];
  cdp.on('Network.requestWillBeSent', ({ request }) => requests.push(request.url));
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails?.exception?.description || exceptionDetails?.text));
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
  if (javaScriptDisabled) await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
  if (observeLayoutShifts) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__pr2aLayoutShifts=[];new PerformanceObserver(function(list){list.getEntries().forEach(function(entry){if(!entry.hadRecentInput)window.__pr2aLayoutShifts.push(entry.value);});}).observe({type:'layout-shift',buffered:true});`,
    });
  }
  await cdp.send('Page.navigate', { url: `${baseUrl}${pathname}` });
  await waitFor(async () => (await evaluate(cdp, 'document.readyState')) === 'complete');
  return { cdp, requests, errors };
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Runtime evaluation failed');
  return response.result.value;
}

async function screenshot(cdp, name) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(resolve(screenshotDirectory, `${name}.png`), Buffer.from(shot.data, 'base64'));
}

const profileDirectory = resolve('.audit-evidence', `chrome-rendering-smoke-${process.pid}`);
mkdirSync(profileDirectory, { recursive: true });
const chromeProcess = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profileDirectory}`,
  '--no-first-run', '--disable-default-apps', '--no-sandbox', '--window-size=1440,1000', 'about:blank',
], { stdio: 'ignore' });

let browserVersion;
const results = {};

try {
  browserVersion = await waitForChrome();

  const home = await openPage('/', { observeLayoutShifts: true });
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 6500));
  results.home = await evaluate(home.cdp, `({
    title: document.querySelector('.hero__title')?.textContent?.trim() || '',
    description: document.querySelector('.hero__desc')?.textContent?.trim() || '',
    errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog]')),
    zaloPlaceholder: Boolean(document.querySelector('#zalo-chat-widget-trigger')),
    layoutShift: (window.__pr2aLayoutShifts || []).reduce((sum, value) => sum + value, 0)
  })`);
  results.home.zaloSdkRequestsBeforeIntent = home.requests.filter((url) => url.includes('sp.zalo.me/plugins/sdk.js')).length;
  results.home.errors = home.errors.filter(Boolean);
  await screenshot(home.cdp, 'home');
  await home.cdp.close();

  const products = await openPage('/san-pham');
  results.productsInitial = await evaluate(products.cdp, `({
    cards: document.querySelectorAll('.product-card').length,
    skeletons: document.querySelectorAll('.product-card-skeleton').length,
    firstImagePriority: document.querySelector('.product-card img')?.getAttribute('fetchpriority') || '',
    sort: document.querySelector('.products-toolbar__sort')?.value || ''
  })`);
  await evaluate(products.cdp, `(() => { const select=document.querySelector('.products-toolbar__sort'); select.value='price-asc'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  results.productsFilterNavigation = await waitFor(async () => String(await evaluate(products.cdp, 'location.search')).includes('sort=price-asc'));
  await evaluate(products.cdp, 'history.back()');
  results.productsBackNavigation = await waitFor(async () => !String(await evaluate(products.cdp, 'location.search')).includes('sort=price-asc'));
  await waitFor(async () => String(await evaluate(products.cdp, `document.querySelector('.products-toolbar__sort')?.value || ''`)) === 'newest');
  results.productsAfterBack = await evaluate(products.cdp, `({ cards: document.querySelectorAll('.product-card').length, sort: document.querySelector('.products-toolbar__sort')?.value || '' })`);
  await screenshot(products.cdp, 'products');
  await products.cdp.close();

  const articles = await openPage('/bai-viet');
  results.articlesInitial = await evaluate(articles.cdp, `({
    cards: document.querySelectorAll('.article-card').length,
    categories: document.querySelectorAll('.articles-cat-btn').length,
    skeletons: document.querySelectorAll('.article-skeleton').length,
    featuredPriority: document.querySelector('.article-featured img')?.getAttribute('fetchpriority') || ''
  })`);
  const categoryClicked = await evaluate(articles.cdp, `(() => { const button=[...document.querySelectorAll('.articles-cat-btn')].find((item,index)=>index>0); if(!button)return false; button.click(); return true; })()`);
  results.articlesCategoryNavigation = categoryClicked && await waitFor(async () => String(await evaluate(articles.cdp, 'location.search')).includes('category='));
  await evaluate(articles.cdp, 'history.back()');
  results.articlesBackNavigation = await waitFor(async () => !String(await evaluate(articles.cdp, 'location.search')).includes('category='));
  await screenshot(articles.cdp, 'articles');
  await articles.cdp.close();

  const noScriptHome = await openPage('/', { javaScriptDisabled: true });
  results.noScriptHome = await evaluate(noScriptHome.cdp, `({ title: document.querySelector('.hero__title')?.textContent?.trim() || '', description: document.querySelector('.hero__desc')?.textContent?.trim() || '' })`);
  await noScriptHome.cdp.close();
  const noScriptProducts = await openPage('/san-pham', { javaScriptDisabled: true });
  results.noScriptProducts = await evaluate(noScriptProducts.cdp, `({ cards: document.querySelectorAll('.product-card').length, skeletons: document.querySelectorAll('.product-card-skeleton').length })`);
  await noScriptProducts.cdp.close();
  const noScriptArticles = await openPage('/bai-viet', { javaScriptDisabled: true });
  results.noScriptArticles = await evaluate(noScriptArticles.cdp, `({ cards: document.querySelectorAll('.article-card').length, categories: document.querySelectorAll('.articles-cat-btn').length })`);
  await noScriptArticles.cdp.close();

  const failures = [];
  if (!results.home.title || !results.home.description) failures.push('home critical copy is missing');
  if (results.home.errorOverlay) failures.push('home has a Next.js error overlay');
  if (results.home.zaloSdkRequestsBeforeIntent !== 0) failures.push('Zalo SDK loaded before user intent');
  if (results.home.layoutShift >= 0.1) failures.push(`home CLS is ${results.home.layoutShift}`);
  if (results.productsInitial.cards === 0 || results.productsInitial.skeletons !== 0) failures.push('products are not server rendered');
  if (!results.productsFilterNavigation || !results.productsBackNavigation || results.productsAfterBack.sort !== 'newest') failures.push('product URL history flow failed');
  if (results.articlesInitial.cards === 0 || results.articlesInitial.categories < 2 || results.articlesInitial.skeletons !== 0) failures.push('articles are not server rendered with API categories');
  if (!results.articlesCategoryNavigation || !results.articlesBackNavigation) failures.push('article URL history flow failed');
  if (!results.noScriptHome.title || results.noScriptProducts.cards === 0 || results.noScriptArticles.cards === 0) failures.push('critical content is not visible without JavaScript');

  const output = { generatedAt: new Date().toISOString(), baseUrl, browser: browserVersion.Browser, pass: failures.length === 0, failures, results };
  writeFileSync(resolve(summaryDirectory, 'rendering-smoke.json'), `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} finally {
  try {
    const browser = createCdpSession(browserVersion?.webSocketDebuggerUrl);
    await browser.send('Browser.close');
    await browser.close();
  } catch {
    chromeProcess.kill();
  }
}
