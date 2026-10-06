/**
 * Every string the web version shows exists in English and in Spanish.
 *
 * Reads the source for every literal key passed to t(...), plus the keys built
 * from a template (listed below with the values they can take), and requires
 * each to resolve in both languages, either from the web version's own strings
 * or from the iPhone app's string files.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lookup, translate, WEB_KEYS, WEB_KEYS_ES } from '../src/web/i18n.ts';
import { FIELD_ORDER } from '../src/carta/lib/extraction-port/port.ts';
import { ACTION_TYPES } from '../src/web/letter.ts';
import { SAMPLES } from '../src/web/samples.ts';
import { sourceKindKey } from '../src/web/content.ts';
import timelinesRaw from '../src/carta/content/timelines.json';

const root = resolve(__dirname, '..', 'src', 'web');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
  });

const literalKeys = new Set<string>();
for (const file of files(root)) {
  for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z_.-]+)'/g)) literalKeys.add(m[1] ?? '');
}

const templated = [
  ...FIELD_ORDER.map((k) => `review.fields.${k}`),
  ...ACTION_TYPES.flatMap((a) => [`review.actions.${a}`, `detail.says_${a}`]),
  ...['t30', 't14', 't7', 't3', 't1', 'day_of', 'appeal_urgent'].map((tier) => `web.reminders.tier.${tier}`),
  ...['apple-vision-recorded', 'tesseract'].map((e) => `web.review.engine.${e}`),
  ...['came', 'never_came', 'online'].map((s) => `web.detail.answered.${s}`),
  ...SAMPLES.map((s) => s.nameKey),
  ...[...timelinesRaw.second_chances, ...timelinesRaw.expected_letters].map((r) => sourceKindKey(r.source_kind)),
];

const resolves = (lang: 'en' | 'es', key: string) =>
  lookup(lang, key) !== undefined || (lookup(lang, `${key}_one`) !== undefined && lookup(lang, `${key}_other`) !== undefined);

describe('strings', () => {
  it('found the keys it is checking (a pass is not vacuous)', () => {
    expect(literalKeys.size).toBeGreaterThan(60);
  });

  for (const key of [...literalKeys, ...templated].sort()) {
    it(`${key} exists in English and Spanish`, () => {
      expect(resolves('en', key), `en: ${key}`).toBe(true);
      expect(resolves('es', key), `es: ${key}`).toBe(true);
    });
  }

  it('the web version’s own strings have the same keys in both languages', () => {
    expect([...WEB_KEYS_ES].sort()).toEqual([...WEB_KEYS].sort());
  });

  it('interpolates and pluralises the way the app does', () => {
    expect(translate('en', 'notice.daysLeft', { count: 1 })).toBe('1 day left');
    expect(translate('es', 'notice.daysLeft', { count: 12 })).toBe('Quedan 12 días');
  });

  it('never tells anyone they qualify', () => {
    const all = [...WEB_KEYS.map((k) => translate('en', k)), ...WEB_KEYS_ES.map((k) => translate('es', k))].join('\n');
    expect(all).not.toMatch(/\byou (may |might |could )?(qualify|be eligible)\b|\busted califica\b|\bes elegible\b/i);
  });
});
