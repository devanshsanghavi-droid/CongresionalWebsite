/**
 * Small claims the site makes about itself, each checked here because a change
 * that broke it would otherwise pass every other test (found by mutating the
 * code and watching the suite stay green):
 *
 *   - the countdown's colours are the app's, tier by tier;
 *   - a sample letter is shown "as if" its own date, and a letter the person
 *     added is always shown against the real clock;
 *   - the reminder that says "ask for a hearing to keep your benefits" uses the
 *     app's urgent wording and counts to the aid-paid-pending date;
 *   - a sample's calendar events say they are from a sample.
 */
import { describe, expect, it } from 'vitest';
import { TONE } from '../src/web/tone.ts';
import { countdownTier } from '../src/carta/lib/urgency.ts';
import { nowFor } from '../src/web/letter.ts';
import type { StoredLetter } from '../src/web/letter.ts';
import { calendarEvents, ladder, reminderText } from '../src/web/reminders.ts';
import { translate } from '../src/web/i18n.ts';
import { isoToLocalMs } from '../src/carta/lib/dates.ts';
import { sourceKindKey, sourceKindLabel } from '../src/web/content.ts';
import timelinesRaw from '../src/carta/content/timelines.json';

const t = (key: string, params?: Readonly<Record<string, string | number>>) => translate('en', key, params);

const NOW = new Date(2026, 9, 6, 12, 0).getTime(); // Oct 6, 2026, noon
const daysFromNow = (days: number): number => new Date(2026, 9, 6 + days).getTime();

describe('countdown colours', () => {
  // The app's src/components/Countdown.tsx: green above 14 days, amber 3 to 14,
  // red below 3 (including the day itself), grey once passed or with no date.
  const cases: [number, string][] = [
    [15, 'green'],
    [14, 'amber'],
    [3, 'amber'],
    [2, 'red'],
    [0, 'red'],
    [-1, 'neutral'],
  ];
  for (const [days, tone] of cases) {
    it(`${days} days left is ${tone}`, () => {
      expect(TONE[countdownTier({ actionType: 'recert_due', deadlineDate: daysFromNow(days) }, NOW)]).toBe(tone);
    });
  }

  it('no date is grey', () => {
    expect(TONE[countdownTier({ actionType: 'approval' }, NOW)]).toBe('neutral');
  });
});

const base: StoredLetter = {
  id: 'x',
  savedAt: 0,
  source: 'photo',
  engine: 'tesseract',
  actionType: 'discontinuance',
  programId: 'CalFresh',
  requiredDocs: [],
  text: '',
  containedSsn: false,
};

describe('the clock a letter is shown against', () => {
  it('a sample set "as if" uses that day', () => {
    const sample: StoredLetter = { ...base, source: 'sample', asIfIso: '2026-09-12' };
    expect(nowFor(sample, NOW)).toBe(isoToLocalMs('2026-09-12'));
  });

  it('a sample with "as if" switched off uses the real clock', () => {
    expect(nowFor({ ...base, source: 'sample' }, NOW)).toBe(NOW);
  });

  it('a letter the person added always uses the real clock, even if it somehow carries an "as if" date', () => {
    expect(nowFor({ ...base, source: 'photo', asIfIso: '2026-09-12' }, NOW)).toBe(NOW);
  });
});

describe('reminder wording', () => {
  const stop: StoredLetter = {
    ...base,
    deadlineDate: '2026-10-30',
    aidPaidPendingDeadline: '2026-10-16',
  };

  it('the urgent reminder uses the app’s "act now" wording, counted to the aid-paid-pending date', () => {
    const urgent = ladder(stop, NOW, 9, 0).find((r) => r.urgent);
    expect(urgent).toBeDefined();
    const text = reminderText(stop, urgent!, t, 'en');
    expect(text.title).toBe(t('notifications.urgentTitle'));
    const days = Math.round((isoToLocalMs('2026-10-16')! - new Date(urgent!.fireAt).setHours(0, 0, 0, 0)) / 86_400_000);
    expect(text.body).toBe(t('notifications.urgentBody', { count: days, program: 'CalFresh' }));
  });

  it('a sample’s calendar events are marked as a sample; a real letter’s are not', () => {
    const reminders = ladder(stop, NOW, 9, 0);
    const sampleEvents = calendarEvents({ ...stop, source: 'sample' }, reminders, t, 'en');
    const realEvents = calendarEvents(stop, reminders, t, 'en');
    expect(sampleEvents.length).toBeGreaterThan(0);
    for (const e of sampleEvents) expect(e.title.startsWith('Sample letter: ')).toBe(true);
    for (const e of realEvents) expect(e.title.startsWith('Sample letter')).toBe(false);
  });
});

describe('rule sources', () => {
  const kinds = [...new Set([...timelinesRaw.second_chances, ...timelinesRaw.expected_letters].map((r) => r.source_kind))];

  it('every kind of source in timelines.json has Spanish words', () => {
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) {
      expect(translate('es', sourceKindKey(kind)), kind).not.toBe(sourceKindKey(kind));
      expect(sourceKindLabel(kind, 'es'), kind).not.toBe(kind);
      expect(sourceKindLabel(kind, 'en')).toBe(kind);
    }
  });
});
