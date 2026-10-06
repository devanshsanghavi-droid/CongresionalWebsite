/**
 * The reminder ladder for one letter, in words, and as calendar events.
 *
 * Which reminders exist and when they fire is Carta's `remindersFor()`
 * (src/carta/lib/urgency.ts), unchanged. What each one says is the iPhone
 * app's own notification wording (`notifications.*` in its string files): the
 * title names the programme and the days left, the body says what to do and
 * names up to three papers the letter asked for.
 */

import { countdownDate, daysUntil, remindersFor } from '../carta/lib/urgency.ts';
import type { ActionType, ScheduledReminder } from '../carta/lib/urgency.ts';
import { docLabel } from './content.ts';
import type { CalendarEvent } from './ics.ts';
import type { Lang, Params } from './i18n.ts';
import { datesOf } from './letter.ts';
import type { StoredLetter } from './letter.ts';

type T = (key: string, params?: Params) => string;

/** How many papers a reminder names before it stops being readable (the app's MAX_NAMED). */
const MAX_NAMED = 3;

export function ladder(letter: StoredLetter, nowMs: number, hour: number, minute: number): ScheduledReminder[] {
  return remindersFor(datesOf(letter), nowMs, hour, minute);
}

function actionLine(actionType: ActionType, t: T): string {
  switch (actionType) {
    case 'recert_due':
      return t('notifications.doRecert');
    case 'info_request':
      return t('notifications.doInfoRequest');
    case 'discontinuance':
    case 'reduction':
    case 'denial':
      return t('notifications.doAppeal');
    default:
      return t('notifications.doGeneric');
  }
}

export function reminderText(
  letter: StoredLetter,
  reminder: ScheduledReminder,
  t: T,
  lang: Lang,
): { title: string; body: string } {
  const program = letter.programId ?? t('notifications.yourBenefits');
  const dates = datesOf(letter);

  // Counted to the aid-paid-pending date, which is what the urgent reminder is
  // about, as the app does since a2af242 (it used to count to the deadline when
  // a letter had both dates).
  if (reminder.urgent && dates.aidPaidPendingDeadline !== undefined) {
    const count = daysUntil(dates.aidPaidPendingDeadline, reminder.fireAt);
    return { title: t('notifications.urgentTitle'), body: t('notifications.urgentBody', { count, program }) };
  }

  const target = dates.deadlineDate ?? countdownDate(dates);
  const count = target === undefined ? 0 : daysUntil(target, reminder.fireAt);
  const title =
    reminder.tier === 'day_of' || count === 0
      ? t('notifications.dueTodayTitle', { program })
      : t('notifications.dueTitle', { count, program });

  const action = actionLine(letter.actionType, t);
  const named = letter.requiredDocs.slice(0, MAX_NAMED).map((id) => docLabel(id, lang));
  const extra = letter.requiredDocs.length - named.length;
  const list = named.length > 0 ? ` ${t('notifications.sendList', { items: named.join(', ') })}` : '';
  const more = extra > 0 ? ` ${t('notifications.andMore', { count: extra })}` : '';
  return { title, body: `${action}${list}${more}` };
}

export function calendarEvents(
  letter: StoredLetter,
  reminders: readonly ScheduledReminder[],
  t: T,
  lang: Lang,
): CalendarEvent[] {
  return reminders.map((reminder) => {
    const text = reminderText(letter, reminder, t, lang);
    // A sample is a made-up letter: its events say so, in the calendar itself.
    const title = letter.source === 'sample' ? `${t('web.sample.badge')}: ${text.title}` : text.title;
    const body = text.body;
    const d = new Date(reminder.fireAt);
    const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return {
      uid: `${letter.id}-${reminder.tier}-${day}@carta-web`,
      startMs: reminder.fireAt,
      durationMinutes: 15,
      title,
      description: `${body}\n\n${t('disclaimer.notLegalAdvice')}`,
    };
  });
}
