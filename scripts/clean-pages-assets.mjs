import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const generatedPaths = [
  'docs/assets',
  'docs/index.html',
  'docs/404.html',
  'docs/manifest.webmanifest',
  'docs/icon.svg',
  'docs/sw.js',
];

for (const target of generatedPaths) {
  rmSync(resolve(target), { force: true, recursive: true });
}
