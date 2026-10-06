#!/usr/bin/env node
/**
 * Copy Carta's own code into this site, from a sibling checkout of the app.
 *
 *   node scripts/sync-from-carta.mjs                 # ../Congressional_App_Challenge at HEAD
 *   node scripts/sync-from-carta.mjs --carta <dir>   # another checkout
 *   node scripts/sync-from-carta.mjs --commit <ref>  # a specific commit
 *
 * WHY IT READS FROM GIT, NOT FROM THE WORKING TREE
 * ------------------------------------------------
 * Every file is read with `git show <commit>:<path>`. The stamp on each file
 * names a commit, and a stamp is only worth something if it is true: copying
 * from a working tree with uncommitted edits would stamp code with a commit it
 * did not come from. Reading from git makes the stamp true by construction.
 *
 * WHAT IT WRITES
 * --------------
 *   src/carta/...            the vendored TypeScript and JSON, laid out exactly
 *                            as in the app (src/extraction -> src/carta/extraction,
 *                            src/lib -> src/carta/lib, content -> src/carta/content),
 *                            so relative imports resolve unchanged
 *   public/samples/...       four fictional corpus photos and the Apple Vision
 *                            OCR recorded from them when the corpus was built
 *   public/screenshots/...   the app's four marketing screenshots, resized to
 *                            720px-wide JPEGs with macOS `sips` (the originals
 *                            are 1206px PNGs, one of them 3.6 MB; the landing page
 *                            should not cost a family's data plan that much).
 *                            Pass --skip-screenshots on a machine without sips to
 *                            leave the committed ones as they are.
 *   tests/fixtures/carta/    the corpus ground truth, for tests only
 *   src/carta/SYNC-MANIFEST.json   one entry per file: source path, commit, and
 *                            the SHA-256 of the source bytes
 *
 * Every .ts file (and the island's tsconfig, which allows comments) gets a
 * header naming its source path, the Carta commit and the SHA-256 of the
 * original bytes. JSON and images cannot carry a comment, so their stamp lives
 * only in the manifest. `tests/vendor.test.ts` checks every file against both.
 *
 * The destination directories are emptied first, so a file deleted from the app
 * cannot linger here looking current.
 *
 * The output is deterministic: no timestamps, no durations. Running it twice
 * against the same commit produces no diff.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const carta = resolve(arg('--carta', join(site, '..', 'Congressional_App_Challenge')));
const ref = arg('--commit', 'HEAD');

if (!existsSync(join(carta, '.git'))) {
  console.error(`No Carta checkout at ${carta}. Pass --carta <dir>.`);
  process.exit(1);
}

const git = (...args) => execFileSync('git', ['-C', carta, ...args], { maxBuffer: 64 * 1024 * 1024 });
const commit = git('rev-parse', `${ref}^{commit}`).toString().trim();

/** Files in a directory at that commit, non-recursive. */
function listDir(dir, filter) {
  return git('ls-tree', '--name-only', `${commit}:${dir}`)
    .toString()
    .split('\n')
    .filter((name) => name && filter(name))
    .map((name) => `${dir}/${name}`);
}

/**
 * [source in Carta, destination in this repo]. Kept short on purpose: only the
 * pure modules the web version actually runs, and what they import.
 */
const ISLAND = listDir('src/extraction', (n) => n.endsWith('.ts') || n === 'tsconfig.json').map((p) => [
  p,
  p.replace(/^src\/extraction\//, 'src/carta/extraction/'),
]);

const LIB = [
  'src/lib/dates.ts', //            ISO <-> local-midnight millis, the storage boundary
  'src/lib/urgency.ts', //          countdown tiers and the reminder ladder
  'src/lib/timelines.ts', //        second-chance dates and the letter forecast
  'src/lib/content/types.ts', //    what timelines.ts imports
  'src/lib/content/parse.ts', //    the validating parser for content/*.json
  'src/lib/content/validate.ts', // what parse.ts imports
  'src/lib/extraction-port/port.ts', //    FIELD_ORDER and FIELD_RISK (the Review flags)
  'src/lib/extraction-port/adapter.ts', // extractNotice + redactText, the app's own wiring
  'src/lib/ocr/types.ts', //        the OcrLine shape every recogniser is mapped to
  'src/lib/ocr/orientation.ts', //  the upside-down check
  'src/lib/theme/tokens.ts', //     colours; tests/tokens.test.ts holds the CSS to them
  'src/lib/i18n/locales/en.json',
  'src/lib/i18n/locales/es.json',
].map((p) => [p, p.replace(/^src\/lib\//, 'src/carta/lib/')]);

const CONTENT = ['content/timelines.json', 'content/doc_types.json'].map((p) => [
  p,
  p.replace(/^content\//, 'src/carta/content/'),
]);

/** Fictional corpus letters. Never a real person's notice (the app's CLAUDE.md §11). */
const SAMPLE_IDS = ['sar7-clean-01', 'na960x-clean-06', 'cf3776-clean-10', 'mc210-clean-12'];
const SAMPLES = SAMPLE_IDS.flatMap((id) => [
  [`tools/corpus/photos/${id}.jpg`, `public/samples/${id}.jpg`],
  [`tools/corpus/ocr/apple-vision/${id}.jpg.json`, `public/samples/${id}.jpg.json`],
]);

/** The corpus's answers, for the tests and the Tesseract measurement. Never shipped to the site. */
const FIXTURES = [['tools/corpus/ground_truth.json', 'tests/fixtures/carta/ground_truth.json']];

const ALL = [...ISLAND, ...LIB, ...CONTENT, ...SAMPLES, ...FIXTURES];

/** [source, destination]; written through sips, so recorded as derived. */
const SCREENSHOTS = ['carta-home', 'carta-notice-detail', 'carta-explanation', 'carta-reminder'].map((name) => [
  `screenshots/marketing/${name}.png`,
  `public/screenshots/${name}.jpg`,
]);
const skipScreenshots = process.argv.includes('--skip-screenshots');
if (!skipScreenshots && spawnSync('sips', ['--help']).status !== 0) {
  console.error('macOS `sips` is needed to resize the screenshots. Re-run with --skip-screenshots to keep the committed ones.');
  process.exit(1);
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** The header. Its exact shape is parsed by tests/vendor.test.ts; change both together. */
function header(source, sha) {
  return [
    '// ---------------------------------------------------------------------------',
    '// VENDORED FROM CARTA - do not edit here. Change it in the app and run',
    '// `npm run sync` (scripts/sync-from-carta.mjs).',
    `//   carta-source: ${source}`,
    `//   carta-commit: ${commit}`,
    `//   source-sha256: ${sha}`,
    '// ---------------------------------------------------------------------------',
    '',
  ].join('\n');
}

const stampable = (path) => path.endsWith('.ts') || path.endsWith('tsconfig.json');

const owned = ['src/carta', 'public/samples', 'tests/fixtures/carta', ...(skipScreenshots ? [] : ['public/screenshots'])];
for (const dir of owned) rmSync(join(site, dir), { recursive: true, force: true });

const manifest = {
  _about:
    'Written by scripts/sync-from-carta.mjs. Every file under src/carta and public/samples, the Carta path it was copied from, and the SHA-256 of the source bytes at that commit. Checked by tests/vendor.test.ts.',
  carta_repository: 'https://github.com/devanshsanghavi-droid/Congressional_App_Challenge',
  carta_commit: commit,
  files: [],
};

for (const [source, dest] of ALL) {
  const bytes = git('show', `${commit}:${source}`);
  const sha = sha256(bytes);
  const stamped = stampable(dest);
  const out = stamped ? Buffer.concat([Buffer.from(header(source, sha)), bytes]) : bytes;
  mkdirSync(dirname(join(site, dest)), { recursive: true });
  writeFileSync(join(site, dest), out);
  manifest.files.push({ dest, source, sha256: sha, stamped });
}

if (skipScreenshots) {
  // Keep the committed screenshots and their existing manifest entries.
  const previous = (() => {
    try {
      return JSON.parse(execFileSync('git', ['-C', site, 'show', 'HEAD:src/carta/SYNC-MANIFEST.json']).toString());
    } catch {
      return { files: [] };
    }
  })();
  manifest.files.push(...previous.files.filter((f) => f.derived !== undefined));
} else {
  const tmp = join(site, 'node_modules', '.carta-sync');
  mkdirSync(tmp, { recursive: true });
  for (const [source, dest] of SCREENSHOTS) {
    const bytes = git('show', `${commit}:${source}`);
    const original = join(tmp, source.split('/').pop());
    writeFileSync(original, bytes);
    mkdirSync(dirname(join(site, dest)), { recursive: true });
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '--resampleWidth', '720', original, '--out', join(site, dest)], { stdio: 'ignore' });
    manifest.files.push({ dest, source, sha256: sha256(bytes), stamped: false, derived: 'sips -s format jpeg -s formatOptions 82 --resampleWidth 720' });
  }
  rmSync(tmp, { recursive: true, force: true });
}

writeFileSync(join(site, 'src/carta/SYNC-MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const dirty = git('status', '--porcelain', '--', ...ALL.map(([s]) => s)).toString().trim();
console.log(`Synced ${ALL.length} files from ${carta} at ${commit.slice(0, 12)}.`);
if (dirty && ref === 'HEAD') {
  console.log('Note: the Carta working tree has uncommitted changes to some of these files.');
  console.log('They were NOT copied; only what is committed at that commit was. Commit them in Carta first if you want them here.');
}
