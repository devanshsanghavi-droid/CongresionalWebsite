import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const TESSERACT_VERSION: string = JSON.parse(
  readFileSync(new URL('./node_modules/tesseract.js/package.json', import.meta.url), 'utf8'),
).version;

/**
 * The site is served from https://devanshsanghavi-droid.github.io/CongresionalWebsite/
 * (the repository name, spelled as the repository spells it).
 */
export const BASE = '/CongresionalWebsite/';

/**
 * The Content-Security-Policy, as one string per directive.
 *
 * Only this site's own origin may be contacted. The two exceptions are not
 * other origins:
 *   - `blob:` for the OCR worker, which tesseract.js starts from a blob URL.
 *     A worker started from a blob URL inherits THIS policy, so the worker is
 *     held to the same rule as the page.
 *   - `data:` / `blob:` for images (the photo preview is an object URL, never
 *     an upload) and for the WebAssembly reader's own data.
 *   - `'wasm-unsafe-eval'` lets the browser compile WebAssembly (the OCR
 *     engine). It does not allow JavaScript `eval`.
 *
 * Injected at build time only: Vite's dev server needs inline scripts and a
 * websocket for hot reload, which this policy would (correctly) block.
 * `frame-ancestors` cannot be set from a meta tag, so it is not here.
 */
export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "connect-src 'self' blob: data:",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "style-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "manifest-src 'self'",
];

function contentSecurityPolicy(): Plugin {
  return {
    name: 'carta-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP_DIRECTIVES.join('; ') },
          injectTo: 'head-prepend',
        },
      ],
    },
  };
}

/**
 * tesseract.js ships a default worker URL on a public CDN. This site always
 * passes its own self-hosted `workerPath`, and the CSP would block the CDN
 * anyway, but the dead default would still sit in the bundle. Replace it with an
 * empty string so a missing `workerPath` fails closed instead of reaching out.
 * (The worker script's own CDN defaults are removed by scripts/copy-ocr-assets.mjs.)
 */
function noTesseractCdnDefault(): Plugin {
  return {
    name: 'carta-no-tesseract-cdn-default',
    enforce: 'pre',
    transform(code, id) {
      if (!/tesseract\.js[\\/]src[\\/]worker[\\/]browser[\\/]defaultOptions\.js$/.test(id)) return null;
      const replaced = code
        .replace(/`https:\/\/cdn\.jsdelivr\.net\/npm\/[^`]*`/g, "''")
        // It reads its own package.json only for that CDN URL's version. Left
        // alone, the bundler inlines the whole file (its repository links, its
        // dev-server URL) into the site. The version is all it needs.
        .replace(/require\('\.\.\/\.\.\/\.\.\/package\.json'\)\.version/, JSON.stringify(TESSERACT_VERSION));
      if (replaced === code) {
        this.error('tesseract.js defaultOptions.js no longer has the expected CDN default; re-check this plugin.');
      }
      return { code: replaced, map: null };
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [react(), contentSecurityPolicy(), noTesseractCdnDefault()],
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        try: fileURLToPath(new URL('./try/index.html', import.meta.url)),
      },
    },
  },
});
