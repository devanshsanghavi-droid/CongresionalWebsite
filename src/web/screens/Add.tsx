import { useId, useState } from 'react';
import type { AppState } from '../App.tsx';
import { navigate } from '../App.tsx';
import { Disclaimer } from '../components/Common.tsx';
import { useI18n } from '../context.ts';
import type { Draft, Engine } from '../letter.ts';
import { FIRST_TIME_MB, ocrSupported, recognizePhoto } from '../ocr.ts';
import type { LetterLanguage, Progress } from '../ocr.ts';
import { readLetter } from '../pipeline.ts';
import { loadSampleOcr, loadSamplePhoto, samplePhotoUrl, SAMPLES } from '../samples.ts';
import type { OcrResult } from '../../carta/lib/ocr/types.ts';

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; progress?: Progress }
  | { kind: 'error'; title: string; body: string };

export function Add({ state }: { state: AppState }) {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [language, setLanguage] = useState<LetterLanguage>(lang === 'es' ? 'spa' : 'eng');
  const ids = { take: useId(), choose: useId(), lang: useId() };
  const busy = status.kind === 'busy';

  const toReview = (
    ocr: OcrResult,
    engine: Engine,
    photoUrl: string,
    source: 'sample' | 'photo',
    sampleId?: string,
  ) => {
    if (ocr.lines.length === 0) {
      setStatus({ kind: 'error', title: t('capture.noTextTitle'), body: t('capture.noTextBody') });
      return;
    }
    const read = readLetter(ocr, Date.now());
    const draft: Draft = {
      source,
      engine,
      photoUrl,
      lines: ocr.lines,
      redactedText: read.redactedText,
      extracted: read.extraction.fields,
      requiredDocs: read.extraction.requiredDocs ?? [],
      containedSsn: read.containedSsn,
      upsideDown: read.upsideDown,
      ...(sampleId === undefined ? {} : { sampleId }),
    };
    state.setDraft(draft);
    setStatus({ kind: 'idle' });
    navigate({ name: 'review' });
  };

  const pickSample = async (id: string) => {
    setStatus({ kind: 'busy' });
    try {
      toReview(await loadSampleOcr(id), 'apple-vision-recorded', samplePhotoUrl(id), 'sample', id);
    } catch {
      setStatus({ kind: 'error', title: t('capture.failedTitle'), body: t('web.ocr.failedBody') });
    }
  };

  const readInBrowser = async (photo: Blob, source: 'sample' | 'photo', sampleId?: string) => {
    if (!ocrSupported()) {
      setStatus({ kind: 'error', title: t('capture.failedTitle'), body: t('web.ocr.unsupported') });
      return;
    }
    setStatus({ kind: 'busy', progress: { stage: 'preparing', fraction: 0 } });
    try {
      const ocr = await recognizePhoto(photo, language, (progress) => setStatus({ kind: 'busy', progress }));
      const url = sampleId !== undefined ? samplePhotoUrl(sampleId) : URL.createObjectURL(photo);
      toReview(ocr, 'tesseract', url, source, sampleId);
    } catch {
      setStatus({ kind: 'error', title: t('capture.failedTitle'), body: t('web.ocr.failedBody') });
    }
  };

  const onFile = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void readInBrowser(file, 'photo');
  };

  const percent = status.kind === 'busy' && status.progress ? Math.round(status.progress.fraction * 100) : undefined;

  return (
    <>
      <h1>{t('web.add.title')}</h1>

      <div role="status" aria-live="polite">
        {status.kind === 'busy' ? (
          <div className="notice-box neutral">
            <p style={{ fontWeight: 600 }}>
              {status.progress === undefined
                ? t('capture.reading')
                : status.progress.stage === 'recognizing'
                  ? t('web.ocr.recognizing', { percent: percent ?? 0 })
                  : t('web.ocr.status', { percent: percent ?? 0 })}
            </p>
            {status.progress !== undefined ? (
              <progress max={100} value={percent ?? 0} aria-hidden="true" />
            ) : null}
            <p className="muted small">{t('capture.readingBody')}</p>
          </div>
        ) : null}
      </div>
      {status.kind === 'error' ? (
        <div className="notice-box red" role="alert">
          <h2>{status.title}</h2>
          <p>{status.body}</p>
        </div>
      ) : null}

      <div className="add-grid">
        <section aria-labelledby="own-title" className="card">
          <h2 id="own-title">{t('web.add.ownTitle')}</h2>
          <p>{t('web.add.ownBody')}</p>
          <div style={{ maxWidth: 320 }}>
            <label className="field-label" htmlFor={ids.lang}>
              {t('web.add.letterLanguage')}
            </label>
            <select
              id={ids.lang}
              value={language}
              onChange={(e) => setLanguage(e.target.value as LetterLanguage)}
              disabled={busy}
            >
              <option value="eng">{t('web.add.lang.eng')}</option>
              <option value="spa">{t('web.add.lang.spa')}</option>
              <option value="both">{t('web.add.lang.both')}</option>
            </select>
          </div>
          <div className="file-buttons">
            <input
              id={ids.take}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={busy}
              onChange={(e) => {
                onFile(e.target.files);
                e.target.value = '';
              }}
            />
            <label htmlFor={ids.take} className="button" aria-disabled={busy}>
              {t('web.add.takePhoto')}
            </label>
            <input
              id={ids.choose}
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) => {
                onFile(e.target.files);
                e.target.value = '';
              }}
            />
            <label htmlFor={ids.choose} className="button secondary" aria-disabled={busy}>
              {t('web.add.choosePhoto')}
            </label>
          </div>
          <p className="caption">{t('web.add.firstTime', { mb: FIRST_TIME_MB })}</p>
        </section>

        <section aria-labelledby="samples-title">
          <h2 id="samples-title">{t('web.add.samplesTitle')}</h2>
          <p>{t('web.add.samplesBody')}</p>
          <p className="muted small">{t('web.add.samplesOcr')}</p>
          <ul className="samples">
            {SAMPLES.map((sample) => {
              const name = t(sample.nameKey);
              return (
                <li key={sample.id} className="card sample">
                  <img
                    src={samplePhotoUrl(sample.id)}
                    alt={t('web.sample.photoAlt', { name })}
                    width={2000}
                    height={2666}
                    loading="lazy"
                  />
                  <h3>{name}</h3>
                  <button type="button" className="button" disabled={busy} onClick={() => void pickSample(sample.id)}>
                    {t('web.add.useSample')}
                    <span className="visually-hidden">: {name}</span>
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      setStatus({ kind: 'busy', progress: { stage: 'preparing', fraction: 0 } });
                      void loadSamplePhoto(sample.id)
                        .then((blob) => readInBrowser(blob, 'sample', sample.id))
                        .catch(() =>
                          setStatus({ kind: 'error', title: t('capture.failedTitle'), body: t('web.ocr.failedBody') }),
                        );
                    }}
                  >
                    {t('web.add.readHere')}
                    <span className="visually-hidden">: {name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <Disclaimer />
    </>
  );
}
