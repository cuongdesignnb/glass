import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function rounded(value, digits = 0) {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const phase = readArg('phase', 'before');
const inputDirectory = resolve('.audit-evidence', 'performance', phase);
const outputDirectory = resolve('artifacts', 'performance', 'summary');
mkdirSync(outputDirectory, { recursive: true });

const groups = new Map();
const filePattern = /^(.*)-(desktop|mobile)-(cold|warm)-(\d+)\.json$/;

for (const file of readdirSync(inputDirectory)) {
  const match = file.match(filePattern);
  if (!match) continue;

  const [, route, device, cacheMode] = match;
  const report = JSON.parse(readFileSync(resolve(inputDirectory, file), 'utf8'));
  const audits = report.audits;
  const resourceItems = audits['resource-summary']?.details?.items || [];
  const networkItems = audits['network-requests']?.details?.items || [];
  const resourceBytes = (type) =>
    resourceItems.find((item) => item.resourceType === type)?.transferSize || 0;
  const documentBytes = networkItems
    .filter((item) => item.resourceType === 'Document')
    .reduce((sum, item) => sum + (item.transferSize || 0), 0);
  const apiRequests = networkItems.filter((item) => /\/api\//.test(item.url)).length;

  const entry = {
    source: basename(file),
    finalUrl: report.finalDisplayedUrl || report.finalUrl,
    performanceScore: (report.categories.performance.score || 0) * 100,
    fcpMs: audits['first-contentful-paint']?.numericValue,
    lcpMs: audits['largest-contentful-paint']?.numericValue,
    cls: audits['cumulative-layout-shift']?.numericValue,
    tbtMs: audits['total-blocking-time']?.numericValue,
    speedIndexMs: audits['speed-index']?.numericValue,
    totalBytes: audits['total-byte-weight']?.numericValue,
    scriptBytes: resourceBytes('script'),
    imageBytes: resourceBytes('image'),
    fontBytes: resourceBytes('font'),
    documentBytes,
    requestCount: networkItems.length,
    apiRequestCount: apiRequests,
    mainThreadMs: audits['mainthread-work-breakdown']?.numericValue,
    bootupMs: audits['bootup-time']?.numericValue,
    lcpElement: audits['largest-contentful-paint-element']?.displayValue || null,
  };

  const key = `${route}|${device}|${cacheMode}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(entry);
}

const summary = [...groups.entries()].map(([key, runs]) => {
  const [route, device, cacheMode] = key.split('|');
  const metric = (name) => median(runs.map((run) => run[name]));
  return {
    route,
    device,
    cacheMode,
    runCount: runs.length,
    finalUrl: runs[0]?.finalUrl,
    median: {
      performanceScore: rounded(metric('performanceScore')),
      fcpMs: rounded(metric('fcpMs')),
      lcpMs: rounded(metric('lcpMs')),
      cls: rounded(metric('cls'), 3),
      tbtMs: rounded(metric('tbtMs')),
      speedIndexMs: rounded(metric('speedIndexMs')),
      totalBytes: rounded(metric('totalBytes')),
      scriptBytes: rounded(metric('scriptBytes')),
      imageBytes: rounded(metric('imageBytes')),
      fontBytes: rounded(metric('fontBytes')),
      documentBytes: rounded(metric('documentBytes')),
      requestCount: rounded(metric('requestCount')),
      apiRequestCount: rounded(metric('apiRequestCount')),
      mainThreadMs: rounded(metric('mainThreadMs')),
      bootupMs: rounded(metric('bootupMs')),
    },
    runs,
  };
}).sort((a, b) =>
  `${a.route}-${a.device}-${a.cacheMode}`.localeCompare(
    `${b.route}-${b.device}-${b.cacheMode}`,
  ),
);

const outputPath = resolve(outputDirectory, `${phase}-lighthouse.json`);
writeFileSync(
  outputPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), phase, summary }, null, 2)}\n`,
);
console.log(`[lighthouse] summary: ${outputPath}`);
