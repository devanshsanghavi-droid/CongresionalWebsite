/**
 * The countdown, as the iPhone app draws it (src/components/Countdown.tsx in
 * the app): Carta's own tier from `countdownTier()`, the app's colours, and the
 * number always paired with words, so colour is never the only signal. One
 * accessible label for the whole thing ("12 days left"), not "12" then "days".
 *
 * One difference from the app: once the date has passed, the web version names
 * it ("Sep 18, 2026 has passed") rather than only saying a date passed, so the
 * biggest thing on the screen never leaves the person guessing which date.
 */

import { countdownDate, countdownTier, daysUntil } from '../../carta/lib/urgency.ts';
import type { NoticeDates } from '../../carta/lib/urgency.ts';
import { useI18n } from '../context.ts';
import { shortDate } from '../format.ts';
import { TONE } from '../tone.ts';

export function Countdown({
  dates,
  nowMs,
  size = 'large',
}: {
  dates: NoticeDates;
  nowMs: number;
  size?: 'large' | 'compact';
}) {
  const { t, lang } = useI18n();
  const tier = countdownTier(dates, nowMs);
  const tone = TONE[tier];
  const target = countdownDate(dates);

  if (target === undefined) {
    return (
      <div className={`countdown chip ${tone}`} role="img" aria-label={t('notice.noDeadline')}>
        <span className="word">{t('notice.noDeadline')}</span>
      </div>
    );
  }

  const days = daysUntil(target, nowMs);
  const cls = `countdown ${size === 'compact' ? 'compact' : ''} ${tone}`;

  if (days < 0) {
    const passed = t('web.countdown.passedOn', { date: shortDate(target, lang) });
    return (
      <div className={cls} role="img" aria-label={passed}>
        <span className="word">{passed}</span>
      </div>
    );
  }
  if (days === 0) {
    return (
      <div className={cls} role="img" aria-label={t('notice.dueToday')}>
        <span className="word" style={size === 'large' ? { fontSize: '2.5rem', fontWeight: 800 } : undefined}>
          {t('notice.dueToday')}
        </span>
      </div>
    );
  }
  return (
    <div className={cls} role="img" aria-label={t('notice.daysLeft', { count: days })} data-tier={tier}>
      <span className="number" aria-hidden="true">
        {days}
      </span>
      <span className="word" aria-hidden="true">
        {t('notice.daysLeftWord', { count: days })}
      </span>
    </div>
  );
}
