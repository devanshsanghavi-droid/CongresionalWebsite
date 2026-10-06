/**
 * "Add reminders to my calendar" across the November 1, 2026 change.
 *
 * A deadline of Thursday November 5, 2026 puts the ladder on both sides of the
 * change: 30, 14 and 7 days before are in daylight time (UTC-7), 3 and 1 days
 * before and the day itself are in standard time (UTC-8). Every reminder must
 * still say 9:00 local. Written as UTC, half of them would land at 8:00 or
 * 10:00; written as elapsed milliseconds from the deadline, the same.
 */
import { describe, expect, it } from 'vitest';
import { buildIcs, floatingLocal, foldLine } from '../src/web/ics.ts';
import { calendarEvents, ladder } from '../src/web/reminders.ts';
import { translate } from '../src/web/i18n.ts';
import type { StoredLetter } from '../src/web/letter.ts';

const t = (key: string, params?: Readonly<Record<string, string | number>>) => translate('en', key, params);

const letter: StoredLetter = {
  id: 'dst',
  savedAt: 0,
  source: 'photo',
  engine: 'tesseract',
  actionType: 'recert_due',
  programId: 'CalFresh',
  deadlineDate: '2026-11-05',
  requiredDocs: ['pay_stub', 'utility_bill'],
  text: '',
  containedSsn: false,
};

const NOW = new Date(2026, 9, 1, 8, 0).getTime(); // Oct 1, 2026, before every rung

function dtstarts(ics: string): string[] {
  return [...ics.matchAll(/^DTSTART:(\S+)\r$/gm)].map((m) => m[1] ?? '');
}

describe('calendar file across daylight saving', () => {
  const reminders = ladder(letter, NOW, 9, 0);
  const ics = buildIcs(calendarEvents(letter, reminders, t, 'en'), NOW, 'Carta reminders');

  it('has one event per reminder on the ladder', () => {
    expect(reminders.map((r) => r.tier)).toEqual(['t30', 't14', 't7', 't3', 't1', 'day_of']);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(6);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(6);
  });

  it('puts every reminder at 9:00 local, on both sides of November 1', () => {
    expect(dtstarts(ics)).toEqual([
      '20261006T090000',
      '20261022T090000',
      '20261029T090000', // daylight time
      '20261102T090000', // standard time
      '20261104T090000',
      '20261105T090000',
    ]);
  });

  it('writes floating local times: no Z and no TZID on DTSTART', () => {
    expect(ics).not.toMatch(/^DTSTART[^:\r\n]*TZID/m);
    expect(ics).not.toMatch(/^DTSTART:\d{8}T\d{6}Z/m);
  });

  it('fires by wall clock, not by elapsed time: Oct 29 to Nov 2 is 4 days and 1 hour', () => {
    const oct29 = reminders.find((r) => r.tier === 't7')?.fireAt ?? 0;
    const nov2 = reminders.find((r) => r.tier === 't3')?.fireAt ?? 0;
    expect(nov2 - oct29).toBe(4 * 86_400_000 + 3_600_000);
  });

  it('handles a deadline on the change day itself', () => {
    const onTheDay = { ...letter, deadlineDate: '2026-11-01' };
    const rs = ladder(onTheDay, NOW, 9, 0);
    expect(rs.map((r) => floatingLocal(r.fireAt))).toContain('20261101T090000');
    expect(rs.map((r) => floatingLocal(r.fireAt))).toContain('20261031T090000');
  });

  it('honours a different reminder time', () => {
    const at645 = buildIcs(calendarEvents(letter, ladder(letter, NOW, 6, 45), t, 'en'), NOW, 'x');
    expect(dtstarts(at645).every((s) => s.endsWith('T064500'))).toBe(true);
  });

  it('says what to do and what to send, in the app’s words', () => {
    expect(ics).toContain('SUMMARY:CalFresh: 30 days left');
    expect(ics).toContain('SUMMARY:CalFresh is due today');
    expect(ics.replace(/\r\n /g, '')).toContain('Send the form back so your benefits continue. Send: Pay stub\\, Utility bill.');
  });

  it('is valid iCalendar text: CRLF lines, UTC DTSTAMP, folded at 75 octets', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toMatch(/^DTSTAMP:20261001T150000Z\r$/m); // 8:00 PDT
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('folds without splitting a multi-byte character', () => {
    const folded = foldLine(`DESCRIPTION:${'Envíe: papeles, ñ, á. '.repeat(10)}`);
    expect(folded.replace(/\r\n /g, '')).toBe(`DESCRIPTION:${'Envíe: papeles, ñ, á. '.repeat(10)}`);
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
  });

  it('skips reminders whose time has already passed, as the app does', () => {
    const late = ladder(letter, new Date(2026, 10, 3, 12).getTime(), 9, 0);
    expect(late.map((r) => r.tier)).toEqual(['t1', 'day_of']);
  });
});
