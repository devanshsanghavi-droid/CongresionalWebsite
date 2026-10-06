/**
 * A letter, from "what Carta read" to "what the person confirmed".
 *
 * Two shapes, deliberately different:
 *
 *   - `Draft` lives in memory while Review is open. It holds the photo URL, the
 *     raw OCR lines (for highlighting where a value came from) and the values
 *     being edited. None of it is ever written anywhere.
 *   - `StoredLetter` is what Save writes to this browser's localStorage, and the
 *     only thing that is. Dates stay ISO `YYYY-MM-DD` strings and are turned
 *     into local-midnight millis at the moment of use, with Carta's own
 *     `isoToLocalMs` (src/carta/lib/dates.ts), so a stored deadline is a *day*,
 *     not an instant that moves if the device changes timezone.
 *
 * What is not stored, by construction: the photo, the OCR lines, the
 * unredacted text, the full case number (only its last four digits, as the
 * iPhone app does, and it is masked in the stored words too), and anything
 * shaped like a Social Security number (store.ts re-runs Carta's redactor over
 * everything before writing).
 *
 * What IS stored, in plain text in this browser: the confirmed dates, the
 * programme, form and office, the name on the letter, and the letter's words
 * with those two numbers removed. localStorage is not encrypted; the page says
 * so where it offers to save.
 */

import { isoToLocalMs } from '../carta/lib/dates.ts';
import type { ExtractedNotice, FieldKey } from '../carta/lib/extraction-port/port.ts';
import { FIELD_ORDER } from '../carta/lib/extraction-port/port.ts';
import type { OcrLine } from '../carta/lib/ocr/types.ts';
import type { NoticeFacts } from '../carta/lib/timelines.ts';
import type { ActionType, NoticeDates } from '../carta/lib/urgency.ts';
import { redactText } from '../carta/lib/extraction-port/adapter.ts';

export const ACTION_TYPES: readonly ActionType[] = [
  'approval',
  'denial',
  'reduction',
  'discontinuance',
  'info_request',
  'recert_due',
];

export const DATE_FIELDS = [
  'deadlineDate',
  'noticeDate',
  'effectiveDate',
  'aidPaidPendingDeadline',
  'appealDeadline',
] as const satisfies readonly FieldKey[];

export type DateField = (typeof DATE_FIELDS)[number];

export const isDateField = (key: FieldKey): key is DateField => (DATE_FIELDS as readonly string[]).includes(key);

export const isActionType = (value: string | undefined): value is ActionType =>
  value !== undefined && (ACTION_TYPES as readonly string[]).includes(value);

export type Engine = 'apple-vision-recorded' | 'tesseract';

export interface Draft {
  readonly source: 'sample' | 'photo';
  readonly sampleId?: string;
  readonly engine: Engine;
  /** A same-origin path or an object URL. Shown during Review, never stored. */
  readonly photoUrl: string;
  readonly lines: readonly OcrLine[];
  /** Already redacted (pipeline.ts). */
  readonly redactedText: string;
  readonly extracted: ExtractedNotice;
  readonly requiredDocs: readonly string[];
  readonly containedSsn: boolean;
  readonly upsideDown: boolean;
}

/** The editable values Review starts from: exactly what was read, nothing invented. */
export function initialValues(extracted: ExtractedNotice): Partial<Record<FieldKey, string>> {
  const values: Partial<Record<FieldKey, string>> = {};
  for (const key of FIELD_ORDER) {
    const value = extracted[key]?.value;
    if (value !== undefined && value.trim() !== '') values[key] = value;
  }
  if (!isActionType(values.actionType)) delete values.actionType;
  return values;
}

export type ExpectedAnswer =
  | { readonly state: 'came' | 'never_came' | 'online' }
  | { readonly state: 'not_yet'; readonly askAgainIso: string };

export interface StoredLetter {
  readonly id: string;
  readonly savedAt: number;
  readonly source: 'sample' | 'photo';
  readonly sampleId?: string;
  /**
   * Samples only: "show as if today were this day". Never applied to a letter
   * the person added themselves; their countdown always uses the real clock.
   */
  readonly asIfIso?: string;
  readonly engine: Engine;
  readonly actionType: ActionType;
  readonly recipientName?: string;
  /** The last four digits of the case number. The full number is never kept. */
  readonly caseLast4?: string;
  readonly programId?: string;
  readonly agency?: string;
  readonly formId?: string;
  readonly noticeDate?: string;
  readonly deadlineDate?: string;
  readonly effectiveDate?: string;
  readonly aidPaidPendingDeadline?: string;
  readonly appealDeadline?: string;
  readonly requiredDocs: readonly string[];
  /** The page text, after Carta's redactor, with the case number masked too. */
  readonly text: string;
  readonly containedSsn: boolean;
  readonly expected?: Readonly<Record<string, ExpectedAnswer>>;
}

/** The last four digits of a case number, unless it is shaped like an SSN. */
export function caseLast4(caseNumber: string | undefined): string | undefined {
  if (caseNumber === undefined) return undefined;
  if (caseNumber.includes('[SSN REMOVED]') || redactText(caseNumber).containedSsn) return undefined;
  const digits = caseNumber.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : undefined;
}

/**
 * Trimmed, empty as absent, and through Carta's redactor: a Social Security
 * number typed into the wrong box on Review is removed like one read off the page.
 */
const clean = (value: string | undefined): string | undefined => {
  const v = value?.trim();
  return v === undefined || v === '' ? undefined : redactText(v).text;
};

const validIso = (value: string | undefined): string | undefined => {
  const v = clean(value);
  return v !== undefined && isoToLocalMs(v) !== undefined ? v : undefined;
};

export function newId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The letter's words, without the full case number.
 *
 * The iPhone app keeps the page text encrypted under a key in the phone's
 * keychain, and stores the case number itself only as a salted hash plus its
 * last four digits. A browser's localStorage is not encrypted, so the web
 * version keeps the text but takes the case number out of it as well: every
 * labelled case number, and every occurrence of the value that was read or
 * typed, becomes "[CASE …9931]". The rules that need the letter's words (a
 * second-chance rule that applies only if the letter mentions a SAR 7, say)
 * still have them.
 */
export function maskCaseNumber(text: string, values: readonly (string | undefined)[], last4: string | undefined): string {
  const mask = `[CASE …${last4 ?? '????'}]`;
  let out = text.replace(
    /((?:Case\s*Number|N[uú]mero\s+del?\s+[Cc]aso)\s*[:#]\s*)([A-Za-z0-9][A-Za-z0-9-]{3,})/gi,
    (_, label: string) => `${label}${mask}`,
  );
  for (const value of values) {
    const v = value?.trim();
    if (v === undefined || v.length < 4) continue;
    out = out.split(v).join(mask);
  }
  return out;
}

/**
 * Build the record Save writes. `actionType` must already be chosen: Review
 * will not save without it, because a letter's type decides what Carta tells
 * the person to do and guessing it is the kind of silent default the app's
 * rules forbid.
 */
export function toStored(
  draft: Draft,
  values: Partial<Record<FieldKey, string>>,
  actionType: ActionType,
  savedAt: number,
  id: string = newId(),
): StoredLetter {
  const optional = <K extends string>(key: K, value: string | undefined): Partial<Record<K, string>> =>
    value === undefined ? {} : ({ [key]: value } as Record<K, string>);

  const last4 = caseLast4(values.caseNumber?.trim()) ?? caseLast4(draft.extracted.caseNumber?.value);
  const base: StoredLetter = {
    id,
    savedAt,
    source: draft.source,
    engine: draft.engine,
    actionType,
    requiredDocs: [...draft.requiredDocs],
    text: maskCaseNumber(draft.redactedText, [draft.extracted.caseNumber?.value, values.caseNumber], last4),
    containedSsn: draft.containedSsn,
    ...optional('sampleId', draft.sampleId),
    ...optional('recipientName', clean(values.recipientName)),
    ...optional('caseLast4', caseLast4(values.caseNumber?.trim())),
    ...optional('programId', clean(values.programId)),
    ...optional('agency', clean(values.agency)),
    ...optional('formId', clean(values.formId)),
    ...optional('noticeDate', validIso(values.noticeDate)),
    ...optional('deadlineDate', validIso(values.deadlineDate)),
    ...optional('effectiveDate', validIso(values.effectiveDate)),
    ...optional('aidPaidPendingDeadline', validIso(values.aidPaidPendingDeadline)),
    ...optional('appealDeadline', validIso(values.appealDeadline)),
  };
  return draft.source === 'sample' ? { ...base, ...optional('asIfIso', defaultAsIf(base)) } : base;
}

const addDaysIso = (iso: string, days: number): string | undefined => {
  const ms = isoToLocalMs(iso);
  if (ms === undefined) return undefined;
  const d = new Date(ms);
  const shifted = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
};

/**
 * The day a sample letter is first shown "as if" it were: the day it is dated,
 * as though it had just arrived. A letter with no date of its own starts three
 * weeks before its deadline. The person can change it, or switch it off.
 */
export function defaultAsIf(letter: Pick<StoredLetter, 'noticeDate' | 'deadlineDate' | 'aidPaidPendingDeadline'>): string | undefined {
  if (letter.noticeDate !== undefined) return letter.noticeDate;
  const target = letter.deadlineDate ?? letter.aidPaidPendingDeadline;
  return target === undefined ? undefined : addDaysIso(target, -21);
}

/** The clock a letter is shown against. Real time, unless a sample is set to "as if". */
export function nowFor(letter: Pick<StoredLetter, 'source' | 'asIfIso'>, realNowMs: number): number {
  if (letter.source !== 'sample' || letter.asIfIso === undefined) return realNowMs;
  return isoToLocalMs(letter.asIfIso) ?? realNowMs;
}

const ms = (iso: string | undefined): number | undefined => (iso === undefined ? undefined : isoToLocalMs(iso));

export function datesOf(letter: StoredLetter): NoticeDates {
  const deadlineDate = ms(letter.deadlineDate);
  const aidPaidPendingDeadline = ms(letter.aidPaidPendingDeadline);
  const appealDeadline = ms(letter.appealDeadline);
  return {
    actionType: letter.actionType,
    ...(deadlineDate === undefined ? {} : { deadlineDate }),
    ...(aidPaidPendingDeadline === undefined ? {} : { aidPaidPendingDeadline }),
    ...(appealDeadline === undefined ? {} : { appealDeadline }),
  };
}

export function factsOf(letter: StoredLetter): NoticeFacts {
  const effectiveDate = ms(letter.effectiveDate);
  const noticeDate = ms(letter.noticeDate);
  const deadlineDate = ms(letter.deadlineDate);
  return {
    actionType: letter.actionType,
    text: letter.text,
    ...(letter.programId === undefined ? {} : { programId: letter.programId }),
    ...(letter.formId === undefined ? {} : { formId: letter.formId }),
    ...(effectiveDate === undefined ? {} : { effectiveDate }),
    ...(noticeDate === undefined ? {} : { noticeDate }),
    ...(deadlineDate === undefined ? {} : { deadlineDate }),
  };
}
