import { useState } from 'react';
import type { AppState } from '../App.tsx';
import { href, navigate } from '../App.tsx';
import { Countdown } from '../components/Countdown.tsx';
import { Disclaimer, useReturnFocus, WebBanner } from '../components/Common.tsx';
import { useI18n } from '../context.ts';
import { timelines } from '../content.ts';
import { longDate, monthYear } from '../format.ts';
import { datesOf, factsOf, nowFor } from '../letter.ts';
import type { StoredLetter } from '../letter.ts';
import { deleteEverything } from '../store.ts';
import { countdownDate, daysUntil } from '../../carta/lib/urgency.ts';
import { forecastLetters } from '../../carta/lib/timelines.ts';

/** Nearest deadline first; passed ones after the live ones; no date last. */
function order(letters: readonly StoredLetter[], realNow: number): StoredLetter[] {
  const key = (l: StoredLetter): number => {
    const target = countdownDate(datesOf(l));
    if (target === undefined) return Number.MAX_SAFE_INTEGER;
    const days = daysUntil(target, nowFor(l, realNow));
    return days < 0 ? 1_000_000 - days : days;
  };
  return [...letters].sort((a, b) => key(a) - key(b) || b.savedAt - a.savedAt);
}

export function Home({ state }: { state: AppState }) {
  const { t, lang } = useI18n();
  const letters = order(state.letters, state.realNow);

  const onTheWay = state.letters.flatMap((letter) =>
    forecastLetters(factsOf(letter), timelines.expectedLetters).map((f) => ({ letter, forecast: f })),
  );

  return (
    <>
      <h1>{t('home.title')}</h1>
      <WebBanner compact={letters.length > 0} />

      {letters.length === 0 ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2>{t('home.emptyTitle')}</h2>
          <p>{t('web.home.emptyBody')}</p>
          <a className="button block" href={href({ name: 'add' })}>
            {t('web.home.add')}
          </a>
        </div>
      ) : (
        <>
          <ul className="letter-list" role="list">
            {letters.map((letter) => {
              const now = nowFor(letter, state.realNow);
              return (
                <li key={letter.id}>
                  <a className="card letter-card" href={href({ name: 'letter', id: letter.id })}>
                    <Countdown dates={datesOf(letter)} nowMs={now} />
                    <div>
                      <p className="program">{letter.programId ?? t('common.unknownProgram')}</p>
                      <p className="action">{t(`review.actions.${letter.actionType}`)}</p>
                      {letter.caseLast4 !== undefined ? (
                        <p className="caption" style={{ margin: 0 }}>
                          {t('notice.caseEnding', { last4: letter.caseLast4 })}
                        </p>
                      ) : null}
                      {letter.source === 'sample' ? (
                        <p className="caption" style={{ margin: '8px 0 0' }}>
                          <span className="badge">{t('web.sample.badge')}</span>{' '}
                          {letter.asIfIso !== undefined
                            ? t('web.sample.asIf', { date: longDate(now, lang) })
                            : null}
                        </p>
                      ) : null}
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
          <a className="button block" href={href({ name: 'add' })}>
            {t('web.home.add')}
          </a>
        </>
      )}

      {onTheWay.length > 0 ? (
        <section className="detail-section" style={{ marginTop: 24 }} aria-labelledby="on-the-way">
          <h2 id="on-the-way">{t('expected.sectionTitle')}</h2>
          <ul className="ladder" role="list">
            {onTheWay.map(({ letter, forecast }) => (
              <li key={`${letter.id}-${forecast.rule.id}`}>
                <a href={href({ name: 'letter', id: letter.id })}>
                  {lang === 'es' ? forecast.rule.titleEs : forecast.rule.title}
                </a>
                <span className="muted">{t('expected.usually', { month: monthYear(forecast.expectFromMs, lang) })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SettingsPanel state={state} />
      <Disclaimer />
    </>
  );
}

function SettingsPanel({ state }: { state: AppState }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<'done' | 'failed' | undefined>(undefined);
  const trigger = useReturnFocus(confirming);
  const pad = (n: number): string => String(n).padStart(2, '0');
  const time = `${pad(state.settings.reminderHour)}:${pad(state.settings.reminderMinute)}`;

  const wipe = () => {
    const ok = deleteEverything();
    state.setDraft(undefined);
    state.refresh();
    setConfirming(false);
    setResult(ok ? 'done' : 'failed');
    if (ok) navigate({ name: 'home' });
  };

  return (
    <section className="settings" aria-labelledby="settings-title">
      <h2 id="settings-title">{t('settings.title')}</h2>
      <div>
        <label className="field-label" htmlFor="reminder-time">
          {t('web.settings.reminderTime')}
        </label>
        <input
          id="reminder-time"
          type="time"
          value={time}
          aria-describedby="reminder-time-hint"
          onChange={(e) => {
            const m = /^(\d{2}):(\d{2})$/.exec(e.target.value);
            if (m) state.setSettings({ ...state.settings, reminderHour: Number(m[1]), reminderMinute: Number(m[2]) });
          }}
          style={{ maxWidth: 200 }}
        />
        <p id="reminder-time-hint" className="muted small" style={{ margin: '6px 0 0' }}>
          {t('web.settings.reminderTimeHint')}
        </p>
      </div>
      <div>
        <h3 style={{ fontSize: '1.0625rem', marginBottom: 4 }}>{t('settings.wipeTitle')}</h3>
        <p className="muted">{t('web.wipe.what')}</p>
        {confirming ? (
          <div className="notice-box red" role="alertdialog" aria-labelledby="wipe-confirm-title" aria-describedby="wipe-confirm-body">
            <h3 id="wipe-confirm-title">{t('settings.wipeConfirmTitle')}</h3>
            <p id="wipe-confirm-body">{t('web.wipe.what')}</p>
            <div className="button-row">
              <button type="button" className="button danger solid" onClick={wipe}>
                {t('settings.wipeConfirmAction')}
              </button>
              {/* Focus starts on Cancel, never on the irreversible button. */}
              <button type="button" className="button secondary" onClick={() => setConfirming(false)} autoFocus>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            ref={trigger}
            type="button"
            className="button danger"
            onClick={() => {
              setResult(undefined);
              setConfirming(true);
            }}
          >
            {t('settings.wipeAction')}
          </button>
        )}
        <p role="status" className={result === 'failed' ? 'error' : 'muted'} style={{ marginTop: 8 }}>
          {result === 'done' ? t('web.wipe.done') : result === 'failed' ? t('web.wipe.failed') : ''}
        </p>
      </div>
      <p className="muted small">{t('web.home.storedHere')}</p>
    </section>
  );
}
