/**
 * Nothing in the built site loads anything from another origin.
 *
 * Builds the site from source into a temporary folder (so this checks the
 * current code, not a stale dist/), then reads every text file in it:
 *
 *   - every HTML page carries the Content-Security-Policy, and the policy names
 *     no origin but the site's own (`'self'`, plus `blob:`/`data:`);
 *   - no HTML attribute and no CSS `url()` or `@import` points off-site;
 *   - no CDN host appears anywhere, including the self-hosted OCR worker, whose
 *     CDN fallbacks scripts/copy-ocr-assets.mjs removes;
 *   - every absolute URL left in any file is accounted for, by kind, below.
 *     A new one fails this test until someone decides which kind it is.
 *
 * Why "accounted for" rather than "none": four kinds of absolute URL are in
 * the bundle and none is a request.
 *   1. XML namespace names React uses to create SVG and MathML elements. They
 *      are identifiers; nothing ever fetches them.
 *   2. Documentation links inside error-message text (React's production error
 *      decoder, and the bundler's message for a missing `require`). They are
 *      only ever printed to the console.
 *   3. Licence texts for the OCR reader (ocr/LICENSES/), shipped as plain files
 *      that no page loads.
 *   4. Links a person can choose to follow: the GitHub repositories and the
 *      sources of the second-chance rules. They are `<a href>`s. Following one
 *      is a navigation the person makes, not a request the page makes, and the
 *      CSP governs the page, not where a person goes.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'vite';
import { CSP_DIRECTIVES } from '../vite.config.ts';
import { REPO_URL, SITE_REPO_URL } from '../src/config.ts';
import timelinesRaw from '../src/carta/content/timelines.json';

const site = resolve(__dirname, '..');
let out = '';

const NAMESPACES = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/1998/Math/MathML',
  'http://www.w3.org/XML/1998/namespace',
  'http://www.w3.org/1999/xhtml',
]);

const ERROR_TEXT = new Set(['https://react.dev/errors/', 'https://rolldown.rs/in-depth/bundling-cjs#require-external-modules']);

const ruleSources = [...timelinesRaw.second_chances, ...timelinesRaw.expected_letters].map((r) => r.source_url);
const LINKS = new Set([REPO_URL, SITE_REPO_URL, ...ruleSources]);

const CDN =
  /jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|googleapis\.com|gstatic\.com|projectnaptha\.com|googletagmanager\.com|google-analytics\.com|jquery\.com/i;

const TEXT = /\.(html|js|css|json|svg|txt|md|mjs)$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

let files: { path: string; text: string }[] = [];

beforeAll(async () => {
  out = mkdtempSync(join(tmpdir(), 'carta-dist-'));
  // Vitest runs with NODE_ENV=test, which would make this a development build
  // of React. Check what actually ships.
  const previous = process.env['NODE_ENV'];
  process.env['NODE_ENV'] = 'production';
  try {
    await build({
      root: site,
      mode: 'production',
      configFile: join(site, 'vite.config.ts'),
      logLevel: 'silent',
      build: { outDir: out, emptyOutDir: true },
    });
  } finally {
    process.env['NODE_ENV'] = previous;
  }
  files = walk(out)
    .filter((p) => TEXT.test(p) || p.endsWith('.wasm.js'))
    .map((path) => ({ path: relative(out, path), text: readFileSync(path, 'utf8') }));
});

afterAll(() => {
  if (out) rmSync(out, { recursive: true, force: true });
});

describe('the built site', () => {
  it('builds both pages and ships the self-hosted reader', () => {
    const paths = files.map((f) => f.path);
    expect(paths).toContain('index.html');
    expect(paths).toContain(join('try', 'index.html'));
    expect(paths).toContain(join('ocr', 'worker.min.js'));
    expect(paths.some((p) => p.startsWith(join('ocr', 'core')))).toBe(true);
  });

  it('puts the Content-Security-Policy on every page, allowing only its own origin', () => {
    const pages = files.filter((f) => f.path.endsWith('.html'));
    expect(pages.length).toBeGreaterThanOrEqual(2);
    for (const page of pages) {
      const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(page.text)?.[1];
      expect(meta, page.path).toBeDefined();
      const policy = (meta ?? '').replace(/&#39;/g, "'");
      expect(policy).toBe(CSP_DIRECTIVES.join('; '));
      expect(policy).not.toMatch(/https?:|\*|'unsafe-inline'|'unsafe-eval'/);
      // It must come first, before anything that could make a request.
      expect(page.text.indexOf('Content-Security-Policy')).toBeLessThan(page.text.indexOf('<script'));
    }
  });

  it('has no off-site address in any HTML attribute', () => {
    for (const page of files.filter((f) => f.path.endsWith('.html'))) {
      const attrs = [...page.text.matchAll(/\s(?:src|href|srcset|poster|action|data|content)="([^"]*)"/g)].map((m) => m[1] ?? '');
      for (const value of attrs) expect(value, `${page.path}: ${value}`).not.toMatch(/(^|[\s,])(https?:)?\/\/(?!\/)/);
    }
  });

  it('has no off-site url() or @import in any stylesheet', () => {
    for (const css of files.filter((f) => f.path.endsWith('.css'))) {
      expect(css.text).not.toMatch(/@import/);
      expect(css.text).not.toMatch(/url\(\s*['"]?(https?:)?\/\//);
    }
  });

  it('mentions no CDN or analytics host anywhere, including the OCR worker', () => {
    for (const f of files) expect(f.text, f.path).not.toMatch(CDN);
  });

  it('has no protocol-relative address ("//host/...") in any script, page or stylesheet', () => {
    // `new Image().src = '//stats.example.org/p.gif'` has no "https:" for the
    // check below to find. The CSP would block it, but this catches it first.
    const relative = /['"`(]\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(\/|['"`)])/i;
    for (const f of files.filter((x) => /\.(js|mjs|html|css)$/.test(x.path))) {
      expect(relative.exec(f.text)?.[0], f.path).toBeUndefined();
    }
  });

  it('accounts for every absolute URL left in any file', () => {
    const unexplained: string[] = [];
    const seen = new Set<string>();
    for (const f of files) {
      for (const m of f.text.matchAll(/https?:\/\/[^\s"'`<>)\\]+/g)) {
        const url = m[0];
        seen.add(url);
        if (NAMESPACES.has(url) || ERROR_TEXT.has(url) || LINKS.has(url)) continue;
        // Pages inside this project's own two repositories (a link to a file in them).
        if (url.startsWith(`${REPO_URL}/`) || url.startsWith(`${SITE_REPO_URL}/`)) continue;
        // Licence texts shipped as plain files beside the reader. No page loads them.
        if (f.path.startsWith(join('ocr', 'LICENSES'))) continue;
        unexplained.push(`${f.path}: ${url}`);
      }
    }
    expect(unexplained).toEqual([]);
    // The links are really there (so the allowlist is not stale padding).
    expect(seen.has(REPO_URL)).toBe(true);
  });
});
