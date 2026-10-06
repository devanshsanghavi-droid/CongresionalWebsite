/**
 * "Add reminders to my calendar": Carta's reminder ladder as an .ics file.
 *
 * The iPhone app schedules each rung of the ladder as a local notification. A
 * web page cannot do that reliably (it would need a server for push, and Carta
 * has none), so the web version hands the same rungs to the person's own
 * calendar instead: one event per reminder, each with an alarm at its start.
 *
 * TIMES ARE FLOATING LOCAL TIMES, ON PURPOSE
 * ------------------------------------------
 * `DTSTART:20261102T090000`, with no `Z` and no `TZID`. RFC 5545 §3.3.5 calls
 * this "floating" time: 9:00 on that day wherever the calendar is. That is
 * exactly what the ladder means - "9 am, three days before" - and it is why the
 * file is correct across a daylight-saving change: there is no UTC offset in it
 * to get wrong. Converting to UTC instead would bake in an offset, and a ladder
 * that straddles November 1 needs two different ones.
 *
 * The fire times themselves come from Carta's `remindersFor()`, which builds
 * each one from calendar components (`new Date(y, m, d - n, hour, minute)`),
 * never by subtracting milliseconds, so they are already right across the
 * change; this file only writes them down without moving them.
 *
 * Pure: everything, including "now" for DTSTAMP, is an argument.
 */

export interface CalendarEvent {
  /** Stable across downloads, so re-importing updates rather than duplicates. */
  readonly uid: string;
  /** Epoch millis of the local wall-clock time the reminder fires at. */
  readonly startMs: number;
  readonly durationMinutes: number;
  readonly title: string;
  readonly description: string;
}

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** Local wall-clock components, floating: YYYYMMDDTHHMMSS. */
export function floatingLocal(ms: number): string {
  const d = new Date(ms);
  return (
    `${pad(d.getFullYear(), 4)}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/** UTC, for DTSTAMP, which RFC 5545 requires in UTC. */
export function utcStamp(ms: number): string {
  const d = new Date(ms);
  return (
    `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** RFC 5545 §3.3.11 TEXT escaping. */
export function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF + space.
 * Counted in UTF-8 bytes, and never splitting a character, because the Spanish
 * text has accents and a split multi-byte character corrupts the file.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
      limit = 74; // continuation lines start with a space, which counts
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildIcs(events: readonly CalendarEvent[], nowMs: number, calendarName: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Carta//Carta web version//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${utcStamp(nowMs)}`,
      `DTSTART:${floatingLocal(event.startMs)}`,
      `DURATION:PT${Math.max(1, Math.round(event.durationMinutes))}M`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(event.title)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/** Start the download. Browser-only; the file never leaves the device. */
export function downloadIcs(ics: string, filename: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
