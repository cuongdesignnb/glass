import { mkdirSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  return sorted[Math.floor(sorted.length / 2)];
}

function round(value) {
  return value === null ? null : Math.round(value * 10) / 10;
}

const baseUrl = readArg('base-url', 'https://mitoo.vn').replace(/\/$/, '');
const phase = readArg('phase', 'before');
const runs = Number(readArg('runs', '3'));
const productSlug = readArg(
  'product-slug',
  'gong-kinh-nu-mat-meo-tr98025-sieu-nhe-gong-kinh-thoi-trang-han-quoc-cao-cap',
);
const articleSlug = readArg(
  'article-slug',
  'mat-tron-deo-kinh-mat-meo-co-hop-khong-loi-khuyen-tu-chuyen-gia-chon-kinh',
);

const targets = [
  ['home', '/'],
  ['products-page', '/san-pham'],
  ['product-detail-page', `/san-pham/${productSlug}`],
  ['articles-page', '/bai-viet'],
  ['article-detail-page', `/bai-viet/${articleSlug}`],
  ['about', '/gioi-thieu'],
  ['faq', '/faq'],
  ['voucher', '/voucher'],
  ['try-on', '/thu-kinh-ao'],
  ['cart', '/gio-hang'],
  ['login', '/dang-nhap'],
  ['admin-login', '/admin/login'],
  ['settings-api', '/api/public/settings'],
  ['menus-api', '/api/public/menus?position=header'],
  ['products-api', '/api/public/products?per_page=12'],
  ['product-detail-api', `/api/public/products/${productSlug}`],
  ['attributes-api', '/api/public/product-attributes'],
  ['categories-api', '/api/public/categories?tree=false'],
  ['articles-api', '/api/public/articles?per_page=12'],
  ['article-detail-api', `/api/public/articles/${articleSlug}`],
];

const coldAgents = () => ({
  http: new http.Agent({ keepAlive: false }),
  https: new https.Agent({ keepAlive: false }),
});
const warmAgents = {
  http: new http.Agent({ keepAlive: true, maxSockets: 1 }),
  https: new https.Agent({ keepAlive: true, maxSockets: 1 }),
};

function measure(inputUrl, cacheMode, redirectCount = 0, agents = coldAgents()) {
  return new Promise((resolvePromise, reject) => {
    const url = new URL(inputUrl);
    const client = url.protocol === 'https:' ? https : http;
    const startedAt = performance.now();
    const timing = { dnsMs: null, connectMs: null, tlsMs: null };
    const request = client.request(
      url,
      {
        agent: url.protocol === 'https:' ? agents.https : agents.http,
        headers: {
          'accept-encoding': 'br, gzip, deflate',
          'cache-control': cacheMode === 'cold' ? 'no-cache' : 'max-age=0',
          'user-agent': 'MitooPerformanceAudit/1.0',
        },
      },
      (response) => {
        const ttfbMs = performance.now() - startedAt;
        const location = response.headers.location;
        if (location && response.statusCode >= 300 && response.statusCode < 400) {
          response.resume();
          if (redirectCount >= 5) return reject(new Error(`Too many redirects: ${inputUrl}`));
          return measure(
            new URL(location, url).toString(),
            cacheMode,
            redirectCount + 1,
            agents,
          ).then(resolvePromise, reject);
        }

        let bytes = 0;
        response.on('data', (chunk) => { bytes += chunk.length; });
        response.on('end', () => {
          resolvePromise({
            status: response.statusCode,
            redirects: redirectCount,
            dnsMs: timing.dnsMs,
            connectMs: timing.connectMs,
            tlsMs: timing.tlsMs,
            ttfbMs,
            totalMs: performance.now() - startedAt,
            bytes,
            headers: {
              server: response.headers.server || null,
              cacheControl: response.headers['cache-control'] || null,
              cacheStatus: response.headers['x-cache'] || response.headers['cf-cache-status'] || null,
              contentEncoding: response.headers['content-encoding'] || null,
              protocol: `HTTP/${response.httpVersion}`,
            },
          });
        });
      },
    );

    request.on('socket', (socket) => {
      if (!socket.connecting) return;
      const socketStartedAt = performance.now();
      socket.once('lookup', () => { timing.dnsMs = performance.now() - socketStartedAt; });
      socket.once('connect', () => { timing.connectMs = performance.now() - socketStartedAt; });
      socket.once('secureConnect', () => { timing.tlsMs = performance.now() - socketStartedAt; });
    });
    request.setTimeout(30000, () => request.destroy(new Error('Request timed out')));
    request.once('error', reject);
    request.end();
  });
}

const raw = [];
for (const [name, pathname] of targets) {
  for (const cacheMode of ['cold', 'warm']) {
    for (let run = 1; run <= runs; run += 1) {
      const agents = cacheMode === 'warm' ? warmAgents : coldAgents();
      console.log(`[http] ${name} ${cacheMode} run ${run}/${runs}`);
      const result = await measure(`${baseUrl}${pathname}`, cacheMode, 0, agents);
      raw.push({ name, pathname, cacheMode, run, ...result });
    }
  }
}

warmAgents.http.destroy();
warmAgents.https.destroy();

const groups = new Map();
for (const entry of raw) {
  const key = `${entry.name}|${entry.cacheMode}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(entry);
}

const summary = [...groups.entries()].map(([key, entries]) => {
  const [name, cacheMode] = key.split('|');
  return {
    name,
    pathname: entries[0].pathname,
    cacheMode,
    runCount: entries.length,
    status: entries[0].status,
    redirects: entries[0].redirects,
    median: {
      dnsMs: round(median(entries.map((entry) => entry.dnsMs))),
      connectMs: round(median(entries.map((entry) => entry.connectMs))),
      tlsMs: round(median(entries.map((entry) => entry.tlsMs))),
      ttfbMs: round(median(entries.map((entry) => entry.ttfbMs))),
      totalMs: round(median(entries.map((entry) => entry.totalMs))),
      bytes: round(median(entries.map((entry) => entry.bytes))),
    },
    headers: entries[0].headers,
  };
}).sort((a, b) => `${a.name}-${a.cacheMode}`.localeCompare(`${b.name}-${b.cacheMode}`));

const outputDirectory = resolve('artifacts', 'performance', 'summary');
mkdirSync(outputDirectory, { recursive: true });
const outputPath = resolve(outputDirectory, `${phase}-http.json`);
writeFileSync(
  outputPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, phase, summary, raw }, null, 2)}\n`,
);
console.log(`[http] summary: ${outputPath}`);
