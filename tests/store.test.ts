/**
 * What reaches this browser's storage, read back as raw bytes.
 *
 * Nothing shaped like a Social Security number: the web version's write gate
 * (src/web/store.ts) is Carta's own redactor, run three times: by the pipeline
 * before Review ever sees the text, on every field as the record is built, and
 * over the whole serialised record before it is written.
 *
 * And none of the letter's words beyond the fixed phrases Carta's rules look
 * for: no address, no income, no phone number, no case number however the
 * reader mangled its label.
 *
 * These tests read back the raw bytes in storage, because a flag that says
 * "redacted" is not evidence (the iPhone app shipped a bug for a month that
 * every flag-checking test passed: its NOTES.md, 2026-09-24).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { readLetter } from '../src/web/pipeline.ts';
import { initialValues, RULE_PHRASES, ruleWords, toStored } from '../src/web/letter.ts';
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
    photoWidth: 1700,
    photoHeight: 2200,
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
    // What the person confirmed is still there.
    expect(stored).toContain('2026-09-05');
    expect(listLetters()[0]?.containedSsn).toBe(true);
  });

  it('keeps only the last four digits of the case number', () => {
    const draft = draftFrom(SSN_LINES);
    const letter = toStored(draft, initialValues(draft.extracted), 'recert_due', 1, 'a2');
    saveLetter(letter);
    expect(letter.caseLast4).toBe('9931');
    expect(raw()).not.toContain('4472');
    expect(raw()).toContain('"caseLast4":"9931"');
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

  it('keeps none of the letter’s words: no address, income, phone or employer', () => {
    const draft = draftFrom([
      ...SSN_LINES,
      line('2255 LANDESS AVE APT 217, MILPITAS', 0.5),
      line('Monthly income before taxes $2,610.00', 0.52),
      line('Employer: BAY AREA FOODS', 0.54),
    ]);
    saveLetter(toStored(draft, initialValues(draft.extracted), 'recert_due', 1, 'w1'));
    const stored = raw();
    for (const words of ['LANDESS', 'MILPITAS', '2,610', 'BAY AREA FOODS', 'STORY ROAD', '758-3401']) {
      expect(stored).not.toContain(words);
    }
    expect(listLetters()[0]?.text).toBe('');
  });

  it('keeps no case number even when the reader mangles its label (Tesseract on a dim photo)', () => {
    // Read from corpus photo mc210-dimangle-13 by Tesseract: the label is not
    // "Case Number", so no case number is extracted, and the person then types
    // it on Review with different punctuation.
    const draft = draftFrom([
      line('MEDI-CAL ANNUAL RENEWAL', 0.05),
      line('ANH TRAN', 0.2),
      line('Case Numb. 40-2291 7734', 0.2, 0.6),
      line('Case Numbey- 40-2291 7734', 0.22, 0.6),
      line('Return this form by: OCTOBER 30, 2026', 0.4),
    ]);
    const values = { ...initialValues(draft.extracted), caseNumber: '40-2291-7734' };
    const letter = toStored(draft, values, 'recert_due', 1, 'w2');
    saveLetter(letter);
    expect(letter.caseLast4).toBe('7734');
    expect(raw()).not.toContain('2291');
    expect(raw()).not.toContain('40-2291');
  });

  it('keeps exactly the rule phrases the letter contains, so the rules that need them still apply', () => {
    expect(RULE_PHRASES.length).toBeGreaterThan(0);
    const text = 'Please return your SAR 7 by the 5th.\nRent: $1,400. You may ask for a hearing\nwithin 90 days of\nthe date of this notice.';
    expect(ruleWords(text)).toBe(['SAR 7', 'within 90 days of the date of this notice'].join('\n'));
    // Running it again changes nothing, so the write gate can always re-run it.
    expect(ruleWords(ruleWords(text))).toBe(ruleWords(text));
  });

  it('cuts down a record an older version of the page saved with the whole letter in it', () => {
    globalThis.localStorage.setItem(
      LETTERS_KEY,
      JSON.stringify([
        {
          id: 'old',
          savedAt: 1,
          source: 'photo',
          engine: 'tesseract',
          actionType: 'recert_due',
          requiredDocs: [],
          text: 'MARIA REYES\n2255 LANDESS AVE\nSAR 7 SEMI-ANNUAL REPORT\nIncome $2,610.00',
          containedSsn: false,
        },
      ]),
    );
    expect(listLetters()[0]?.text).toBe('SAR 7\nSemi-Annual');
    expect(raw()).not.toContain('LANDESS');
    expect(raw()).not.toContain('2,610');
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
