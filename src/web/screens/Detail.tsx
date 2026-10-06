/**
 * One saved letter: the iPhone app's Notice Detail, deadline first.
 *
 * Order matters and is the app's: the countdown, then what the letter says,
 * what to do and by when, then the reminders, then the dates the letter does
 * not print. Every date shown is one the person confirmed on Review, or one
 * worked out from it by a sourced rule (content/timelines.json), labelled as
 * worked out, with "ask your county to confirm".
 */

import { useId, useState } from 'react';
import type { AppState } from '../App.tsx';
import { href, navigate } from '../App.tsx';
import { Countdown } from '../components/Countdown.tsx';
import { Disclaimer } from '../components/Common.tsx';
import { useI18n } from '../context.ts';
import { docLabel, timelines } from '../content.ts';
import { dateAndTime, longDate, monthYear, shortDate, timeOfDay, todayIso } from '../format.ts';
import { buildIcs, downloadIcs } from '../ics.ts';
import { datesOf, defaultAsIf, factsOf, nowFor } from '../letter.ts';
import type { ExpectedAnswer, StoredLetter } from '../letter.ts';
import { calendarEvents, ladder } from '../reminders.ts';
import { removeLetter, updateLetter } from '../store.ts';
import { isoToLocalMs, localMsToIso } from '../../carta/lib/dates.ts';
import { addDays, forecastLetters, secondChancesFor } from '../../carta/lib/timelines.ts';

export function Detail({ state, id }: { state: AppState; id: string }) {
  const { t } = useI18n();
  const letter = state.letters.find((l) => l.id === id);
  if (letter === undefined) {
    return (
      <>
        <h1>{t('detail.errorTitle')}</h1>
        <p>{t('web.detail.notFound')}</p>
        <a className="button" href={href({ name: 'home' })}>
          {t('common.back')}
        </a>
      </>
    );
  }
  return <LetterView state={state} letter={letter} />;
}

function LetterView({ state, letter }: { state: AppState; letter: StoredLetter }) {
  const { t, lang } = useI18n();
  const now = nowFor(letter, state.realNow);
  const dates = datesOf(letter);
  const program = letter.programId ?? t('common.unknownProgram');
  const ms = (iso: string | undefined) => (iso === undefined ? undefined : isoToLocalMs(iso));
  const deadline = ms(letter.deadlineDate);
  const app = ms(letter.aidPaidPendingDeadline);
  const effective = ms(letter.effectiveDate);
  const appeal = ms(letter.appealDeadline);
  const noticeDate = ms(letter.noticeDate);

  const update = (change: (l: StoredLetter) => StoredLetter) => {
    try {
      updateLetter(letter.id, change);
    } finally {
      state.refresh();
    }
  };

  return (
    <>
      <div className="card" style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <Countdown dates={dates} nowMs={now} />
        <div>
          <h1 style={{ margin: 0 }}>{program}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {t(`review.actions.${letter.actionType}`)}
          </p>
          {letter.caseLast4 !== undefined ? (
            <p className="caption" style={{ margin: 0 }}>
              {t('notice.caseEnding', { last4: letter.caseLast4 })}
            </p>
          ) : null}
        </div>
      </div>

      {letter.source === 'sample' ? <AsIfControl letter={letter} realNow={state.realNow} update={update} /> : null}

      <section className="detail-section" aria-labelledby="says">
        <h2 id="says">{t('detail.whatThisSays')}</h2>
        <p>
          {t('detail.saysFrom', { program, office: letter.agency ?? t('detail.yourOffice') })}{' '}
          {t(`detail.says_${letter.actionType}`)}
        </p>
        {letter.recipientName !== undefined ? (
          <p className="muted">{t('detail.addressedTo', { name: letter.recipientName })}</p>
        ) : null}
        {noticeDate !== undefined ? <p className="muted">{t('detail.letterDated', { date: longDate(noticeDate, lang) })}</p> : null}
      </section>

      <section className="detail-section" aria-labelledby="must-do">
        <h2 id="must-do">{t('detail.whatYouMustDo')}</h2>
        <p>
          {deadline !== undefined
            ? t('detail.mustDoWithDeadline')
            : letter.actionType === 'approval'
              ? t('detail.mustDoApproval')
              : t('detail.mustDoNoDeadline')}
        </p>
        {letter.requiredDocs.length > 0 ? (
          <>
            <h3 style={{ fontSize: '1.0625rem' }}>{t('web.detail.papers')}</h3>
            <ul>
              {letter.requiredDocs.map((d) => (
                <li key={d}>{docLabel(d, lang)}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="detail-section" aria-labelledby="by-when">
        <h2 id="by-when">{t('detail.byWhen')}</h2>
        {deadline !== undefined ? (
          <p style={{ fontWeight: 700, fontSize: '1.25rem' }}>{t('detail.deadlineIs', { date: longDate(deadline, lang) })}</p>
        ) : (
          <p className="muted">{t('web.detail.noDeadlineFound')}</p>
        )}
        {app !== undefined ? (
          <div className="notice-box red">
            <h3>{t('detail.keepBenefitsTitle')}</h3>
            <p>{t('detail.keepBenefitsBody', { date: longDate(app, lang) })}</p>
          </div>
        ) : null}
        {effective !== undefined ? <p className="muted">{t('detail.takesEffect', { date: longDate(effective, lang) })}</p> : null}
        {appeal !== undefined ? <p className="muted">{t('detail.appealBy', { date: longDate(appeal, lang) })}</p> : null}
      </section>

      <Reminders state={state} letter={letter} now={now} />
      <SecondChances letter={letter} now={now} />
      <LettersOnTheWay letter={letter} now={now} update={update} />

      <section className="detail-section" aria-labelledby="check">
        <h2 id="check">{t('detail.checkForYourself')}</h2>
        <p className="muted">{t('detail.checkBody')}</p>
        <details>
          <summary>{t('detail.seeText')}</summary>
          <p className="caption">{t('detail.textIsAsRead')} {t('web.detail.textIsRedacted')}</p>
          <pre className="letter-text" tabIndex={0}>
            {letter.text}
          </pre>
        </details>
      </section>

      <RemoveLetter state={state} letter={letter} />
      <Disclaimer />
    </>
  );
}

function AsIfControl({
  letter,
  realNow,
  update,
}: {
  letter: StoredLetter;
  realNow: number;
  update: (change: (l: StoredLetter) => StoredLetter) => void;
}) {
  const { t, lang } = useI18n();
  const inputId = useId();
  const asIfMs = letter.asIfIso === undefined ? undefined : isoToLocalMs(letter.asIfIso);
  return (
    <section className="notice-box neutral as-if" aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`}>
        <span className="badge">{t('web.sample.badge')}</span>{' '}
        {asIfMs !== undefined ? t('web.sample.asIf', { date: longDate(asIfMs, lang) }) : t('web.sample.realToday', { date: longDate(realNow, lang) })}
      </h2>
      <p className="small">{t('web.sample.why')}</p>
      <div className="as-if-row">
        <div>
          <label className="field-label" htmlFor={inputId}>
            {t('web.sample.asIfLabel')}
          </label>
          <input
            id={inputId}
            type="date"
            value={letter.asIfIso ?? todayIso(realNow)}
            onChange={(e) => {
              const iso = e.target.value;
              if (isoToLocalMs(iso) !== undefined) update((l) => ({ ...l, asIfIso: iso }));
            }}
          />
        </div>
        {letter.asIfIso !== undefined ? (
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              update((l) => {
                const { asIfIso: _drop, ...rest } = l;
                void _drop;
                return rest;
              })
            }
          >
            {t('web.sample.useReal')}
          </button>
        ) : (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              const iso = defaultAsIf(letter);
              if (iso !== undefined) update((l) => ({ ...l, asIfIso: iso }));
            }}
          >
            {t('web.sample.useAsIf')}
          </button>
        )}
      </div>
      {letter.asIfIso !== undefined ? (
        <p className="caption" style={{ margin: 0 }}>
          {t('web.sample.realToday', { date: longDate(realNow, lang) })}
        </p>
      ) : null}
    </section>
  );
}

function Reminders({ state, letter, now }: { state: AppState; letter: StoredLetter; now: number }) {
  const { t, lang } = useI18n();
  const { reminderHour: hour, reminderMinute: minute } = state.settings;
  const reminders = ladder(letter, now, hour, minute);
  const dates = datesOf(letter);
  const hasDate = dates.deadlineDate !== undefined || dates.aidPaidPendingDeadline !== undefined;
  const at = new Date(2026, 0, 1, hour, minute).getTime();

  const download = () => {
    const events = calendarEvents(letter, reminders, t, lang);
    const ics = buildIcs(events, Date.now(), t('web.reminders.calendarName'));
    const name = (letter.programId ?? 'letter').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadIcs(ics, `carta-${name}-reminders.ics`);
  };

  return (
    <section className="detail-section" aria-labelledby="reminders">
      <h2 id="reminders">{t('web.reminders.title')}</h2>
      <p className="muted">{t('web.reminders.body', { time: timeOfDay(at, lang) })}</p>
      {!hasDate ? (
        <p>{t('web.reminders.noDate')}</p>
      ) : reminders.length === 0 ? (
        <p>{t('web.reminders.none')}</p>
      ) : (
        <>
          <ul className="ladder">
            {reminders.map((r) => (
              <li key={`${r.tier}-${r.fireAt}`} className={r.urgent ? 'urgent' : undefined}>
                <span>{t(`web.reminders.tier.${r.tier}`)}</span>
                <span>{dateAndTime(r.fireAt, lang)}</span>
              </li>
            ))}
          </ul>
          {letter.source === 'sample' && letter.asIfIso !== undefined ? (
            <p className="caption">{t('web.reminders.sampleNote')}</p>
          ) : null}
          <button type="button" className="button" onClick={download} aria-describedby="ics-hint">
            {t('web.reminders.add')}
          </button>
          <p id="ics-hint" className="caption" style={{ marginTop: 8 }}>
            {t('web.reminders.addHint')}
          </p>
        </>
      )}
    </section>
  );
}

function SecondChances({ letter, now }: { letter: StoredLetter; now: number }) {
  const { t, lang } = useI18n();
  const chances = secondChancesFor(factsOf(letter), timelines.secondChances, now);
  if (chances.length === 0) return null;
  return (
    <section className="detail-section" aria-labelledby="second-chances">
      <h2 id="second-chances">{t('secondChance.sectionTitle')}</h2>
      <p className="muted">{t('secondChance.intro')}</p>
      {chances.map(({ rule, dateMs, passed }) => (
        <article key={rule.id} className="chance" aria-labelledby={`chance-${rule.id}`}>
          <h3 id={`chance-${rule.id}`}>{lang === 'es' ? rule.titleEs : rule.title}</h3>
          <p className="by">{t('secondChance.by', { date: longDate(dateMs, lang) })}</p>
          {passed ? <p className="error">{t('secondChance.passed')}</p> : null}
          <p>{lang === 'es' ? rule.es : rule.en}</p>
          <p className="muted">{lang === 'es' ? rule.conditionEs : rule.condition}</p>
          <details>
            <summary>{t('secondChance.whereFrom')}</summary>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>{t('secondChance.ruleTitle')}</p>
            <blockquote className="rule" lang="en">
              {rule.ruleText}
            </blockquote>
            <p className="small">{rule.sourceName}</p>
            <p className="caption">
              {t('secondChance.checkedOn', { date: shortDate(isoToLocalMs(rule.verifiedOn) ?? 0, lang), kind: rule.sourceKind })}
            </p>
            <p className="small">
              <a href={rule.sourceUrl} rel="noopener noreferrer">
                {t('web.detail.source')}
              </a>{' '}
              <span className="caption">{t('web.detail.opensElsewhere')}</span>
            </p>
          </details>
        </article>
      ))}
    </section>
  );
}

function LettersOnTheWay({
  letter,
  now,
  update,
}: {
  letter: StoredLetter;
  now: number;
  update: (change: (l: StoredLetter) => StoredLetter) => void;
}) {
  const { t, lang } = useI18n();
  const forecasts = forecastLetters(factsOf(letter), timelines.expectedLetters);
  if (forecasts.length === 0) return null;

  const answer = (ruleId: string, value: ExpectedAnswer | undefined) =>
    update((l) => {
      const expected = { ...(l.expected ?? {}) };
      if (value === undefined) delete expected[ruleId];
      else expected[ruleId] = value;
      return { ...l, expected };
    });

  return (
    <section className="detail-section" aria-labelledby="on-the-way">
      <h2 id="on-the-way">{t('expected.sectionTitle')}</h2>
      {forecasts.map(({ rule, expectFromMs, askOnMs }) => {
        const month = monthYear(expectFromMs, lang);
        const given = letter.expected?.[rule.id];
        const askAgain = given?.state === 'not_yet' ? isoToLocalMs(given.askAgainIso) : undefined;
        const due = now >= askOnMs && (given === undefined || (askAgain !== undefined && now >= askAgain));
        return (
          <article key={rule.id} className="chance" aria-labelledby={`expected-${rule.id}`}>
            <h3 id={`expected-${rule.id}`}>{lang === 'es' ? rule.titleEs : rule.title}</h3>
            <p>{t('expected.usually', { month })}</p>
            {due ? (
              <div className="notice-box amber">
                <h3>{t('expected.askTitle')}</h3>
                <p>{t('expected.askBody', { month })}</p>
                <div className="button-row">
                  <button type="button" className="button secondary" onClick={() => answer(rule.id, { state: 'came' })}>
                    {t('expected.came')}
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      answer(rule.id, { state: 'not_yet', askAgainIso: localMsToIso(addDays(now, 14)) })
                    }
                  >
                    {t('expected.notYet')}
                  </button>
                  <button type="button" className="button secondary" onClick={() => answer(rule.id, { state: 'never_came' })}>
                    {t('expected.neverCame')}
                  </button>
                  <button type="button" className="button secondary" onClick={() => answer(rule.id, { state: 'online' })}>
                    {t('expected.online')}
                  </button>
                </div>
                <a href={href({ name: 'add' })}>{t('expected.scanIt')}</a>
              </div>
            ) : null}
            {given !== undefined && !due ? (
              <>
                {given.state === 'never_came' ? (
                  <div className="notice-box red">
                    <h3>{t('expected.neverCameTitle')}</h3>
                    <p>{t('expected.neverCameBody')}</p>
                  </div>
                ) : given.state === 'not_yet' ? (
                  <p className="muted">
                    {t('web.detail.askAgainOn', { date: longDate(isoToLocalMs(given.askAgainIso) ?? now, lang) })}
                  </p>
                ) : (
                  <p className="muted">{t(`web.detail.answered.${given.state}`)}</p>
                )}
                <button type="button" className="link-button" onClick={() => answer(rule.id, undefined)}>
                  {t('web.detail.changeAnswer')}
                </button>
              </>
            ) : null}
            <details>
              <summary>{t('expected.whereFrom')}</summary>
              <blockquote className="rule" lang="en">
                {rule.ruleText}
              </blockquote>
              <p className="small">{rule.sourceName}</p>
              <p className="caption">
                {t('secondChance.checkedOn', { date: shortDate(isoToLocalMs(rule.verifiedOn) ?? 0, lang), kind: rule.sourceKind })}
              </p>
              <p className="small">
                <a href={rule.sourceUrl} rel="noopener noreferrer">
                  {t('web.detail.source')}
                </a>{' '}
                <span className="caption">{t('web.detail.opensElsewhere')}</span>
              </p>
            </details>
          </article>
        );
      })}
    </section>
  );
}

function RemoveLetter({ state, letter }: { state: AppState; letter: StoredLetter }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="detail-section">
      {confirming ? (
        <div className="notice-box red" role="alertdialog" aria-labelledby="remove-title" aria-describedby="remove-body">
          <h3 id="remove-title">{t('detail.removeTitle')}</h3>
          <p id="remove-body">{t('web.detail.removeBody')}</p>
          <div className="button-row">
            <button
              type="button"
              className="button danger solid"
              autoFocus
              onClick={() => {
                try {
                  removeLetter(letter.id);
                  state.refresh();
                  navigate({ name: 'home' });
                } catch {
                  setFailed(true);
                }
              }}
            >
              {t('detail.removeConfirm')}
            </button>
            <button type="button" className="button secondary" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </button>
          </div>
          {failed ? <p className="error">{t('web.detail.removeFailed')}</p> : null}
        </div>
      ) : (
        <button type="button" className="button danger" onClick={() => setConfirming(true)}>
          {t('detail.remove')}
        </button>
      )}
    </div>
  );
}
