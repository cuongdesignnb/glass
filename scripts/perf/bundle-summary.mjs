import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const label = readArg('label', 'after');
if (!/^[a-z0-9-]+$/i.test(label)) {
  throw new Error('--label contains unsupported characters');
}

const nextDirectory = resolve('.next');
const manifest = JSON.parse(
  readFileSync(resolve(nextDirectory, 'app-build-manifest.json'), 'utf8'),
);

const routeSegments = {
  home: ['/layout', '/(public)/layout', '/(public)/page'],
  products: ['/layout', '/(public)/layout', '/(public)/san-pham/page'],
  'product-detail': [
    '/layout',
    '/(public)/layout',
    '/(public)/san-pham/[slug]/page',
  ],
  articles: ['/layout', '/(public)/layout', '/(public)/bai-viet/page'],
  'article-detail': [
    '/layout',
    '/(public)/layout',
    '/(public)/bai-viet/[slug]/page',
  ],
  'try-on': ['/layout', '/(public)/layout', '/(public)/thu-kinh-ao/page'],
};

const markers = {
  tryOn: [
    'TryOnModal',
    'camera-preview',
    'processing-status',
    'getUserMedia',
    'navigator.mediaDevices',
  ],
  adminEditor: ['tiptap', 'prosemirror'],
};

const routes = Object.entries(routeSegments).map(([route, segments]) => {
  const files = [...new Set(
    segments.flatMap((segment) => manifest.pages[segment] || []),
  )].filter((file) => file.endsWith('.js'));
  const fileDetails = files.map((file) => {
    const absolutePath = resolve(nextDirectory, file);
    const source = readFileSync(absolutePath, 'utf8');
    return {
      file,
      bytes: statSync(absolutePath).size,
      markers: Object.fromEntries(
        Object.entries(markers).map(([name, values]) => [
          name,
          values.some((value) => source.toLowerCase().includes(value.toLowerCase())),
        ]),
      ),
    };
  });

  return {
    route,
    rawJavaScriptBytes: fileDetails.reduce((sum, file) => sum + file.bytes, 0),
    chunkCount: fileDetails.length,
    markerChunks: Object.fromEntries(
      Object.keys(markers).map((name) => [
        name,
        fileDetails.filter((file) => file.markers[name]).map((file) => file.file),
      ]),
    ),
    files: fileDetails,
  };
});

const outputDirectory = resolve('artifacts', 'performance', 'summary');
mkdirSync(outputDirectory, { recursive: true });
const outputPath = resolve(outputDirectory, `${label}-bundle.json`);
writeFileSync(
  outputPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), label, routes }, null, 2)}\n`,
);
console.log(`[bundle] summary: ${outputPath}`);
