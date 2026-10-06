#!/usr/bin/env node
/**
 * Copy the in-browser text reader (tesseract.js) into public/ocr/, so the site
 * serves every byte of it itself. Nothing is ever loaded from a CDN.
 *
 * Runs before every dev server, build and test (see package.json). The output
 * is gitignored: these are third-party files that package-lock.json already pins
 * exactly, and committing ~17 MB of them would add nothing.
 *
 *   public/ocr/worker.min.js                     tesseract.js's worker script
 *   public/ocr/core/tesseract-core-*-lstm.wasm.js the WebAssembly engine, three
 *                                                builds; tesseract.js picks the one
 *                                                the browser's CPU features support
 *   public/ocr/lang/{eng,spa}.traineddata.gz     English and Spanish LSTM models
 *                                                ("best_int", the small accurate set)
 *   public/ocr/LICENSES/                         their licences (Apache 2.0)
 *
 * tesseract.js's worker script falls back to jsDelivr when it is not told where
 * the engine and the language data are. This site always tells it, and the CSP
 * would block jsDelivr anyway, but the fallback URLs are rewritten to empty
 * strings here so that a missing path fails closed instead of reaching out, and
 * so tests/dist-origins.test.ts can require that no CDN appears anywhere in the
 * built site.
 */

import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(site, 'public', 'ocr');
const require = createRequire(import.meta.url);

const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const tesseract = pkgDir('tesseract.js');
const core = pkgDir('tesseract.js-core');

rmSync(out, { recursive: true, force: true });
for (const d of ['core', 'lang', 'LICENSES']) mkdirSync(join(out, d), { recursive: true });

// The worker script, with its CDN fallbacks removed.
const worker = readFileSync(join(tesseract, 'dist', 'worker.min.js'), 'utf8');
// Minified, so the fallbacks are plain string literals joined with .concat().
const CDN_TEMPLATE = /(["`])https:\/\/cdn\.jsdelivr\.net\/npm\/[^"`]*\1/g;
const found = worker.match(CDN_TEMPLATE) ?? [];
if (found.length !== 2) {
  throw new Error(
    `Expected 2 CDN fallbacks in tesseract.js worker.min.js, found ${found.length}. ` +
      'tesseract.js changed; re-check this script before shipping.',
  );
}
const cleaned = worker.replace(CDN_TEMPLATE, '""');
if (/cdn\.jsdelivr|unpkg\.com|projectnaptha/.test(cleaned)) {
  throw new Error('A CDN reference survived in worker.min.js.');
}
writeFileSync(join(out, 'worker.min.js'), cleaned);

// The engine. LSTM-only builds, because the site only ever uses the LSTM model.
for (const file of [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
]) {
  copyFileSync(join(core, file), join(out, 'core', file));
}

// The language data.
for (const lang of ['eng', 'spa']) {
  const dir = pkgDir(`@tesseract.js-data/${lang}`);
  copyFileSync(join(dir, '4.0.0_best_int', `${lang}.traineddata.gz`), join(out, 'lang', `${lang}.traineddata.gz`));
}

copyFileSync(join(tesseract, 'LICENSE.md'), join(out, 'LICENSES', 'tesseract.js-LICENSE.md'));
copyFileSync(join(core, 'LICENSE'), join(out, 'LICENSES', 'tesseract.js-core-LICENSE'));
copyFileSync(join(tesseract, 'dist', 'worker.min.js.LICENSE.txt'), join(out, 'LICENSES', 'worker.min.js.LICENSE.txt'));

console.log('OCR assets copied to public/ocr (self-hosted; CDN fallbacks removed).');
