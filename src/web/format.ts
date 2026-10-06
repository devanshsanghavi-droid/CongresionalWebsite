/** Dates as people read them, in the page's language. */

import type { Lang } from './i18n.ts';

const locale = (lang: Lang): string => (lang === 'es' ? 'es-US' : 'en-US');

export function longDate(ms: number, lang: Lang): string {
  return new Date(ms).toLocaleDateString(locale(lang), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function shortDate(ms: number, lang: Lang): string {
  return new Date(ms).toLocaleDateString(locale(lang), { year: 'numeric', month: 'short', day: 'numeric' });
}

export function monthYear(ms: number, lang: Lang): string {
  return new Date(ms).toLocaleDateString(locale(lang), { year: 'numeric', month: 'long' });
}

export function timeOfDay(ms: number, lang: Lang): string {
  return new Date(ms).toLocaleTimeString(locale(lang), { hour: 'numeric', minute: '2-digit' });
}

export function dateAndTime(ms: number, lang: Lang): string {
  return `${shortDate(ms, lang)}, ${timeOfDay(ms, lang)}`;
}

/** Today's date as ISO YYYY-MM-DD, local. */
export function todayIso(nowMs: number): string {
  const d = new Date(nowMs);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
