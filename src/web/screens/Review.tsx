/**
 * "Check what Carta read": the iPhone app's Review screen, in a browser.
 *
 * The rules are the app's (its CLAUDE.md §3 rule 6 and §4):
 *   - every field is shown and editable, and nothing is kept until Save;
 *   - a field the reader did not find is empty, never guessed;
 *   - the name and the case number are flagged "Please check this" whenever
 *     they were read by machine, because they fail in ways that still look
 *     right (the app's FIELD_RISK, vendored unchanged);
 *   - a value read but implausible is shown and marked, not dropped.
 * The two flagged fields also show, right under the box, the part of the photo
 * they were read from, made bigger: on a phone the whole page is too small to
 * read, and those are the two fields that must be checked against it. On a
 * wide screen, focusing any field also outlines where it was read on the photo.
 */

import { useId, useMemo, useState } from 'react';
import type { AppState } from '../App.tsx';
import { href, navigate } from '../App.tsx';
import { Disclaimer } from '../components/Common.tsx';
import { useI18n } from '../context.ts';
import { ACTION_TYPES, initialValues, isActionType, isDateField, toStored } from '../letter.ts';
import type { Draft } from '../letter.ts';
import { saveLetter } from '../store.ts';
import { effectiveRisk, FIELD_ORDER } from '../../carta/lib/extraction-port/port.ts';
import type { FieldKey } from '../../carta/lib/extraction-port/port.ts';
import type { OcrBox } from '../../carta/lib/ocr/types.ts';

export function Review({ state }: { state: AppState }) {
  const { t } = useI18n();
  const draft = state.draft;
  if (draft === undefined) {
    return (
      <>
        <h1>{t('review.nothingTitle')}</h1>
        <p>{t('web.review.nothingBody')}</p>
        <a className="button" href={href({ name: 'add' })}>
          {t('web.home.add')}
        </a>
      </>
    );
  }
  return <ReviewForm state={state} draft={draft} />;
}

type Status = 'clear' | 'check' | 'invalid' | 'missing' | 'none';

function ReviewForm({ state, draft }: { state: AppState; draft: Draft }) {
  const { t } = useI18n();
  const [values, setValues] = useState(() => initialValues(draft.extracted));
  const [focused, setFocused] = useState<FieldKey | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [photoOpen, setPhotoOpen] = useState(() => window.matchMedia('(min-width: 960px)').matches);
  const formId = useId();

  const statusOf = (key: FieldKey): Status => {
    const field = draft.extracted[key];
    const value = values[key];
    if (value === undefined || value.trim() === '') return 'missing';
    const edited = field?.value !== value;
    if (edited) return 'none';
    const risk = effectiveRisk(key, field);
    if (field?.invalid !== undefined) return 'invalid';
    if (risk === 'high') return 'check';
    if (risk === 'verified') return 'clear';
    return 'none';
  };

  /** Where on the photo a field was read: the boxes of its source lines. */
  const boxesOf = (key: FieldKey): OcrBox[] =>
    (draft.extracted[key]?.sourceLineIndexes ?? []).flatMap((i) => {
      const line = draft.lines[i];
      return line === undefined ? [] : [line.box];
    });

  /**
   * Flagged as it was read, whatever has been typed since: the zoomed photo
   * stays under the field while the person corrects it.
   */
  const flaggedAtRead = (key: FieldKey): boolean => {
    const field = draft.extracted[key];
    if (field?.value === undefined || field.value.trim() === '') return false;
    return field.invalid !== undefined || effectiveRisk(key, field) === 'high';
  };

  const highlights = useMemo(() => (focused === undefined ? [] : boxesOf(focused)), [focused, draft]);

  const save = () => {
    const action = values.actionType;
    if (!isActionType(action)) {
      setError(t('web.review.actionRequired'));
      document.getElementById(`${formId}-actionType`)?.focus();
      return;
    }
    try {
      const letter = toStored(draft, values, action, Date.now());
      saveLetter(letter);
      state.refresh();
      state.setDraft(undefined);
      navigate({ name: 'letter', id: letter.id });
    } catch {
      setError(t('web.review.saveFailed'));
    }
  };

  const discard = () => {
    state.setDraft(undefined);
    navigate({ name: 'add' });
  };

  return (
    <>
      <h1 id={`${formId}-title`}>{t('review.title')}</h1>
      <p>{t('review.intro')}</p>
      <p className="muted small">{t(`web.review.engine.${draft.engine}`)}</p>

      {draft.containedSsn ? (
        <div className="notice-box green" role="note">
          <p>{t('web.review.ssnRemoved')}</p>
        </div>
      ) : null}
      {draft.upsideDown ? (
        <div className="notice-box amber" role="note">
          <h2>{t('capture.upsideDownTitle')}</h2>
          <p>{t('capture.upsideDownBody')}</p>
        </div>
      ) : null}
      {values.deadlineDate === undefined || values.deadlineDate === '' ? (
        <div className="notice-box amber" role="note">
          <h2>{t('review.noDeadlineTitle')}</h2>
          <p>{t('review.noDeadlineBody')}</p>
        </div>
      ) : null}

      <div className="review-layout">
        <details
          className="review-photo"
          open={photoOpen}
          onToggle={(e) => setPhotoOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary>{t('web.review.showPhoto')}</summary>
          <div className="photo-frame">
            <img src={draft.photoUrl} alt={t('detail.photoAlt')} />
            {highlights.map((box, i) => (
              <div
                key={i}
                className="highlight"
                aria-hidden="true"
                style={{
                  left: `${Math.max(0, box.x - 0.006) * 100}%`,
                  top: `${Math.max(0, box.y - 0.004) * 100}%`,
                  width: `${(box.w + 0.012) * 100}%`,
                  height: `${(box.h + 0.008) * 100}%`,
                }}
              />
            ))}
          </div>
          <p className="caption">{t('web.review.highlight')}</p>
          <p className="caption">{t('web.review.photoNotSaved')}</p>
        </details>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          aria-labelledby={`${formId}-title`}
          noValidate
        >
          <div className="fields">
            {FIELD_ORDER.map((key) => {
              const status = statusOf(key);
              const inputId = `${formId}-${key}`;
              const statusId = `${inputId}-status`;
              const flagged = status === 'check' || status === 'invalid';
              const crops = flaggedAtRead(key) ? boxesOf(key).slice(0, 2) : [];
              return (
                <div key={key} className={`field ${flagged ? 'flagged' : ''} ${status === 'invalid' ? 'invalid' : ''}`}>
                  <label className="field-label" htmlFor={inputId}>
                    {t(`review.fields.${key}`)}
                  </label>
                  {key === 'actionType' ? (
                    <select
                      id={inputId}
                      value={values.actionType ?? ''}
                      aria-describedby={`${statusId} ${formId}-error`}
                      aria-required="true"
                      aria-invalid={error !== undefined && !isActionType(values.actionType)}
                      onFocus={() => setFocused(key)}
                      onChange={(e) => {
                        setValues({ ...values, actionType: e.target.value });
                        setError(undefined);
                      }}
                    >
                      <option value="">{t('web.review.chooseAction')}</option>
                      {ACTION_TYPES.map((a) => (
                        <option key={a} value={a}>
                          {t(`review.actions.${a}`)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={inputId}
                      type={isDateField(key) ? 'date' : 'text'}
                      value={values[key] ?? ''}
                      autoComplete="off"
                      spellCheck={false}
                      aria-describedby={statusId}
                      aria-invalid={status === 'invalid'}
                      onFocus={() => setFocused(key)}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    />
                  )}
                  <FieldStatus id={statusId} status={status} />
                  {crops.length > 0 ? (
                    <div className="crops">
                      <p className="crop-caption" aria-hidden="true">
                        {t('web.review.cropCaption')}
                      </p>
                      {crops.map((box, i) => (
                        <SourceCrop
                          key={i}
                          photoUrl={draft.photoUrl}
                          box={box}
                          aspect={draft.photoWidth / Math.max(1, draft.photoHeight)}
                          label={t('web.review.cropAlt')}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="save-bar">
            <p id={`${formId}-error`} role="alert" className="error" style={{ margin: 0 }}>
              {error ?? ''}
            </p>
            <p id={`${formId}-store`} className="store-short">
              {t('web.review.storeShort')}
            </p>
            <button type="submit" className="button block" aria-describedby={`${formId}-store`}>
              {t('web.review.save')}
            </button>
          </div>
          <p className="muted small" style={{ marginTop: 12 }}>
            {t('web.review.storeNote')}
          </p>
          <button type="button" className="button secondary block" style={{ marginTop: 12 }} onClick={discard}>
            {t('review.discard')}
          </button>
        </form>
      </div>
      <Disclaimer />
    </>
  );
}

/**
 * The part of the photo a value was read from, made bigger. The photo is placed
 * inside a box shaped like that part of the page, scaled so the part fills the
 * box's width, and shifted so the part sits in the box. Boxes are fractions of
 * the photo (Carta's OcrLine shape), so this needs no pixel sizes. A very wide
 * line is shown from its start, at most 60% of the page across, so the text
 * stays big enough to read on a phone.
 */
function SourceCrop({ photoUrl, box, aspect, label }: { photoUrl: string; box: OcrBox; aspect: number; label: string }) {
  const padX = 0.015;
  const padY = Math.max(0.006, box.h * 0.5);
  const x0 = Math.max(0, box.x - padX);
  const y0 = Math.max(0, box.y - padY);
  const width = Math.min(0.6, Math.min(1, box.x + box.w + padX) - x0);
  const height = Math.min(1, box.y + box.h + padY) - y0;
  if (!(width > 0 && height > 0 && aspect > 0)) return null;
  return (
    <div className="source-crop" role="img" aria-label={label} style={{ aspectRatio: `${width * aspect} / ${height}` }}>
      <img
        src={photoUrl}
        alt=""
        style={{ width: `${100 / width}%`, transform: `translate(${-x0 * 100}%, ${-y0 * 100}%)` }}
      />
    </div>
  );
}

function FieldStatus({ id, status }: { id: string; status: Status }) {
  const { t } = useI18n();
  switch (status) {
    case 'check':
      return (
        <p id={id} className="field-status check">
          {t('review.checkThis')}. <span style={{ fontWeight: 400 }}>{t('review.checkThisWhy')}</span>
        </p>
      );
    case 'invalid':
      return (
        <p id={id} className="field-status invalid">
          {t('review.invalidValue')}. <span style={{ fontWeight: 400 }}>{t('review.invalidWhy')}</span>
        </p>
      );
    case 'clear':
      return (
        <p id={id} className="field-status clear">
          {t('review.readClearly')}
        </p>
      );
    case 'missing':
      return (
        <p id={id} className="field-status missing">
          {t('web.review.notFound')}
        </p>
      );
    case 'none':
      return <p id={id} className="visually-hidden" />;
  }
}
