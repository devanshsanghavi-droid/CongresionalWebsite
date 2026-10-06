/**
 * The only place the web version writes anything: this browser's localStorage.
 *
 * There is no server, so this is all the "database" there is. Two rules, both
 * the iPhone app's (its CLAUDE.md §3):
 *
 *   1. **Never persist an SSN.** `saveLetter` re-runs Carta's own redactor over
 *      the page text, then serialises the whole record and runs the redactor
 *      over THAT. If anything SSN-shaped is still present anywhere in what would
 *      be written, nothing is written and it throws. A flag saying "redacted" is
 *      not trusted; the bytes are checked (the app learned this the hard way:
 *      NOTES.md, 2026-09-24).
 *   2. **The person confirms before anything is kept.** Only Review's Save calls
 *      this, with the values the person checked.
 *
 * Every access is wrapped: storage can be missing (private windows, blocked site
 * data) and the page must still work, it just cannot remember.
 */

import { redactText } from '../carta/lib/extraction-port/adapter.ts';
import type { StoredLetter } from './letter.ts';

export const LETTERS_KEY = 'carta.web.letters.v1';
export const SETTINGS_KEY = 'carta.web.settings.v1';
/** Every key this site writes starts with this. "Delete everything" removes them all. */
export const PREFIX = 'carta.web.';

export interface Settings {
  readonly language?: 'en' | 'es';
  readonly reminderHour: number;
  readonly reminderMinute: number;
}

export const DEFAULT_SETTINGS: Settings = { reminderHour: 9, reminderMinute: 0 };

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

export class StorageRefused extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'StorageRefused';
  }
}

export function listLetters(): StoredLetter[] {
  try {
    const raw = storage()?.getItem(LETTERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredLetter[]) : [];
  } catch {
    return [];
  }
}

export function getLetter(id: string): StoredLetter | undefined {
  return listLetters().find((l) => l.id === id);
}

/** The write gate. Everything stored goes through here. */
function writeLetters(letters: readonly StoredLetter[]): void {
  const gated = letters.map((l) => ({ ...l, text: redactText(l.text).text }));
  const serialised = JSON.stringify(gated);
  if (redactText(serialised).containedSsn) {
    throw new StorageRefused('Refusing to store: something shaped like a Social Security number is still present.');
  }
  const s = storage();
  if (!s) throw new StorageRefused('This browser is not letting Carta save anything.');
  try {
    s.setItem(LETTERS_KEY, serialised);
  } catch {
    throw new StorageRefused('This browser is not letting Carta save anything.');
  }
}

export function saveLetter(letter: StoredLetter): void {
  writeLetters([...listLetters().filter((l) => l.id !== letter.id), letter]);
}

export function updateLetter(id: string, change: (l: StoredLetter) => StoredLetter): StoredLetter | undefined {
  const letters = listLetters();
  const i = letters.findIndex((l) => l.id === id);
  const current = letters[i];
  if (i < 0 || current === undefined) return undefined;
  const next = change(current);
  letters[i] = next;
  writeLetters(letters);
  return next;
}

export function removeLetter(id: string): void {
  writeLetters(listLetters().filter((l) => l.id !== id));
}

export function readSettings(): Settings {
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const hour = Number.isInteger(parsed.reminderHour) ? Number(parsed.reminderHour) : DEFAULT_SETTINGS.reminderHour;
    const minute = Number.isInteger(parsed.reminderMinute) ? Number(parsed.reminderMinute) : DEFAULT_SETTINGS.reminderMinute;
    return {
      reminderHour: hour >= 0 && hour <= 23 ? hour : DEFAULT_SETTINGS.reminderHour,
      reminderMinute: minute >= 0 && minute <= 59 ? minute : DEFAULT_SETTINGS.reminderMinute,
      ...(parsed.language === 'en' || parsed.language === 'es' ? { language: parsed.language } : {}),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: Settings): void {
  try {
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // A preference that cannot be remembered is still applied for this visit.
  }
}

/**
 * "Delete everything": every key this site ever wrote. Returns true when
 * nothing of Carta's is left afterwards, which is checked, not assumed.
 */
export function deleteEverything(): boolean {
  const s = storage();
  if (!s) return true;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) s.removeItem(key);
    for (let i = 0; i < s.length; i++) if (s.key(i)?.startsWith(PREFIX)) return false;
    return true;
  } catch {
    return false;
  }
}
