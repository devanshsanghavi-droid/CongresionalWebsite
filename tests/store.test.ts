/**
 * Nothing shaped like a Social Security number reaches this browser's storage.
 *
 * The web version's write gate (src/web/store.ts) is Carta's own redactor,
 * run three times: by the pipeline before Review ever sees the text, on every
 * field as the record is built, and over the whole serialised record before it
 * is written. These tests read back the raw bytes in storage, because a flag
 * that says "redacted" is not evidence (the iPhone app shipped a bug for a month
 * that every flag-checking test passed: its NOTES.md, 2026-09-24).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { readLetter } from '../src/web/pipeline.ts';
import { initialValues, toStored } from '../src/web/letter.ts';
import type { Draft, StoredLetter } from '../src/web/letter.ts';
import { deleteEverything, LETTERS_KEY, listLetters, saveLetter, StorageRefused, writeSettings } from '../src/web/store.ts';
import type { OcrLine } from '../src/carta/lib/ocr/types.ts';

class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });
});

const raw = (): string => globalThis.localStorage.getItem(LETTERS_KEY) ?? '';

const line = (text: string, y: number, x = 0.1): OcrLine => ({ text, confidence: 1, box: { x, y, w: 0.4, h: 0.012 } });

/** A letter carrying an SSN in several of the shapes Carta's redactor knows. */
const SSN_LINES = [
  line('SANTA CLARA COUNTY SOCIAL SERVICES AGENCY', 0.05),
  line('MARIA REYES', 0.2),
  line('1428 STORY ROAD APT 12', 0.212),
  line('SAN JOSE, CA 95122', 0.224),
  line('Case Number: 01-4472-9931', 0.2, 0.6),
  line('SSN: 123-45-6789', 0.3),
  line('Social Security Number: 987 65 4321', 0.32),
  line('Número de Seguro Social 555-12-3456', 0.34),
  line('Ref 111223333', 0.36),
  line('Your number on file: XXX-XX-6789', 0.38),
  line('SUBMIT BY: SEPTEMBER 5, 2026', 0.4),
  line('Phone: (408) 758-3401', 0.42),
];
const DIGIT_RUNS = ['123-45-6789', '6789', '987 65 4321', '4321', '555-12-3456', '111223333', 'XXX-XX'];

function draftFrom(lines: readonly OcrLine[]): Draft {
  const text = lines.map((l) => l.text).join('\n');
  const read = readLetter({ lines, text, width: 1700, height: 2200, engine: 'test' }, 0);
  return {
    source: 'photo',
    engine: 'tesseract',
    photoUrl: 'blob:test',
    lines,
    redactedText: read.redactedText,
    extracted: read.extraction.fields,
    requiredDocs: read.extraction.requiredDocs ?? [],
    containedSsn: read.containedSsn,
    upsideDown: read.upsideDown,
  };
}

describe('the write gate', () => {
  it('strips every SSN from the letter text before it is stored', () => {
    const draft = draftFrom(SSN_LINES);
    expect(draft.containedSsn).toBe(true);
    saveLetter(toStored(draft, initialValues(draft.extracted), 'recert_due', 1, 'a1'));
    const stored = raw();
    for (const digits of DIGIT_RUNS) expect(stored).not.toContain(digits);
    expect(stored).toContain('[SSN REMOVED]');
    // What the letter needs is still there.
    expect(stored).toContain('2026-09-05');
    expect(stored).toContain('(408) 758-3401');
    expect(listLetters()[0]?.containedSsn).toBe(true);
  });

  it('keeps only the last four digits of the case number, in the field and in the words', () => {
    const draft = draftFrom(SSN_LINES);
    const letter = toStored(draft, initialValues(draft.extracted), 'recert_due', 1, 'a2');
    saveLetter(letter);
    expect(letter.caseLast4).toBe('9931');
    expect(raw()).not.toContain('01-4472-9931');
    expect(raw()).toContain('Case Number: [CASE …9931]');
  });

  it('removes an SSN typed into a field on Review', () => {
    const draft = draftFrom(SSN_LINES);
    const values = { ...initialValues(draft.extracted), recipientName: 'MARIA 123-45-6789', caseNumber: '123-45-6789' };
    const letter = toStored(draft, values, 'recert_due', 1, 'a3');
    saveLetter(letter);
    expect(raw()).not.toContain('123-45-6789');
    expect(letter.caseLast4).toBeUndefined();
  });

  it('re-redacts text handed to it unredacted, instead of trusting the caller', () => {
    const letter: StoredLetter = {
      id: 'a4',
      savedAt: 1,
      source: 'photo',
      engine: 'tesseract',
      actionType: 'info_request',
      requiredDocs: [],
      text: 'Hello\nSSN 123-45-6789\nbye',
      containedSsn: false,
    };
    saveLetter(letter);
    expect(raw()).not.toContain('123-45-6789');
  });

  it('refuses to write at all if an SSN is anywhere else in the record', () => {
    const sneaky = {
      id: 'a5',
      savedAt: 1,
      source: 'photo',
      engine: 'tesseract',
      actionType: 'info_request',
      requiredDocs: [],
      text: '',
      containedSsn: false,
      agency: 'Office 123-45-6789',
    } as StoredLetter;
    expect(() => saveLetter(sneaky)).toThrow(StorageRefused);
    expect(raw()).toBe('');
  });

  it('"Delete everything" removes every key the site wrote, and nothing else', () => {
    const draft = draftFrom(SSN_LINES);
    saveLetter(toStored(draft, initialValues(draft.extracted), 'recert_due', 1, 'a6'));
    writeSettings({ reminderHour: 7, reminderMinute: 30, language: 'es' });
    globalThis.localStorage.setItem('someone-else', 'keep');
    expect(deleteEverything()).toBe(true);
    expect(globalThis.localStorage.length).toBe(1);
    expect(globalThis.localStorage.getItem('someone-else')).toBe('keep');
  });
});
