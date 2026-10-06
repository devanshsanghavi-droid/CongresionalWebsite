/**
 * The site's colours are the iPhone app's colours. site.css declares them as
 * CSS custom properties; Carta's tokens.ts (vendored unchanged) is the source.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { color } from '../src/carta/lib/theme/tokens.ts';

const css = readFileSync(join(resolve(__dirname, '..'), 'src/styles/site.css'), 'utf8');
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('colours', () => {
  for (const [name, value] of Object.entries(color)) {
    it(`--${kebab(name)} is Carta's ${name} (${value})`, () => {
      const declared = new RegExp(`--${kebab(name)}:\\s*(#[0-9A-Fa-f]{6})\\s*;`).exec(css)?.[1];
      expect(declared?.toUpperCase()).toBe(value.toUpperCase());
    });
  }

  it('sets the body text to at least 16px', () => {
    const body = /body\s*\{[^}]*font-size:\s*([\d.]+)rem/.exec(css)?.[1];
    expect(Number(body) * 16).toBeGreaterThanOrEqual(16);
  });

  it('gives controls a 44px floor', () => {
    expect(css).toMatch(/--touch:\s*44px/);
    expect(css).toMatch(/\.button\s*\{[^}]*min-height:\s*var\(--touch\)/);
  });
});
