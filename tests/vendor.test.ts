/**
 * The vendored Carta code is what its stamp says it is.
 *
 * scripts/sync-from-carta.mjs copies Carta's files into src/carta (and samples
 * into public/samples), stamping each .ts file with its source path, the Carta
 * commit, and the SHA-256 of the source bytes, and listing every file in
 * src/carta/SYNC-MANIFEST.json. This test re-derives all three from the bytes
 * on disk, so a hand edit to a vendored file, a file added without the sync,
 * or a stamp that disagrees with its manifest entry fails the build.
 *
 * When a Carta checkout sits beside this repo and has the stamped commit, the
 * files are also compared byte for byte with `git show <commit>:<path>`. In CI
 * there is no such checkout and that part is skipped, which the test says.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const site = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(join(site, 'src/carta/SYNC-MANIFEST.json'), 'utf8')) as {
  carta_commit: string;
  files: { dest: string; source: string; sha256: string; stamped: boolean; derived?: string }[];
};

const sha256 = (buf: Buffer | string): string => createHash('sha256').update(buf).digest('hex');

const HEADER =
  /^\/\/ -{75}\n\/\/ VENDORED FROM CARTA - do not edit here\. Change it in the app and run\n\/\/ `npm run sync` \(scripts\/sync-from-carta\.mjs\)\.\n\/\/   carta-source: (.+)\n\/\/   carta-commit: ([0-9a-f]{40})\n\/\/   source-sha256: ([0-9a-f]{64})\n\/\/ -{75}\n/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const cartaCheckout = resolve(site, '..', 'Congressional_App_Challenge');
const haveCommit = (() => {
  try {
    execFileSync('git', ['-C', cartaCheckout, 'cat-file', '-e', `${manifest.carta_commit}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe('vendored Carta code', () => {
  it('names a full commit hash', () => {
    expect(manifest.carta_commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('includes the whole extraction island and the modules the web version runs', () => {
    const dests = manifest.files.map((f) => f.dest);
    for (const required of [
      'src/carta/extraction/index.ts',
      'src/carta/extraction/redact.ts',
      'src/carta/extraction/types.ts',
      'src/carta/lib/urgency.ts',
      'src/carta/lib/dates.ts',
      'src/carta/lib/timelines.ts',
      'src/carta/lib/content/parse.ts',
      'src/carta/content/timelines.json',
    ]) {
      expect(dests).toContain(required);
    }
  });

  for (const entry of manifest.files) {
    it(`${entry.dest} matches its stamp`, () => {
      const bytes = readFileSync(join(site, entry.dest));
      if (entry.derived !== undefined) {
        // A resized image: the stamp is of its source; the file must exist.
        expect(bytes.length).toBeGreaterThan(0);
        return;
      }
      if (!entry.stamped) {
        expect(sha256(bytes)).toBe(entry.sha256);
        return;
      }
      const text = bytes.toString('utf8');
      const header = HEADER.exec(text);
      expect(header, 'missing or altered VENDORED FROM CARTA header').not.toBeNull();
      const [whole, source, commit, sha] = header ?? [];
      expect(source).toBe(entry.source);
      expect(commit).toBe(manifest.carta_commit);
      expect(sha).toBe(entry.sha256);
      // The body after the header is byte-for-byte the source file.
      expect(sha256(Buffer.from(text.slice((whole ?? '').length), 'utf8'))).toBe(entry.sha256);
    });
  }

  it('has no file under src/carta that the sync did not write', () => {
    const listed = new Set(manifest.files.map((f) => f.dest));
    const onDisk = walk(join(site, 'src/carta'))
      .map((p) => relative(site, p))
      .filter((p) => p !== 'src/carta/SYNC-MANIFEST.json');
    expect(onDisk.filter((p) => !listed.has(p))).toEqual([]);
  });

  it('keeps the extraction island importing only itself', () => {
    const island = walk(join(site, 'src/carta/extraction')).filter((p) => p.endsWith('.ts'));
    for (const file of island) {
      const imports = [...readFileSync(file, 'utf8').matchAll(/^\s*(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/gm)].map(
        (m) => m[1],
      );
      for (const spec of imports) expect(spec, `${relative(site, file)} imports ${spec}`).toMatch(/^\.\/[\w-]+\.ts$/);
    }
  });

  it.runIf(haveCommit)('is byte-identical to Carta at the stamped commit (sibling checkout)', () => {
    for (const entry of manifest.files) {
      const source = execFileSync('git', ['-C', cartaCheckout, 'show', `${manifest.carta_commit}:${entry.source}`], {
        maxBuffer: 64 * 1024 * 1024,
      });
      expect(sha256(source), entry.source).toBe(entry.sha256);
    }
  });

  it.skipIf(haveCommit)('(no Carta checkout beside this repo: byte comparison with the source repo skipped)', () => {
    expect(existsSync(cartaCheckout) && haveCommit).toBe(false);
  });
});
