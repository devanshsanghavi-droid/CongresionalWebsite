/**
 * The bundled samples go through the web version's pipeline and come out the
 * way Carta reads them: same extraction code, same answers.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { recordedToOcr } from '../src/web/ocr-map.ts';
import type { RecordedVisionOcr } from '../src/web/ocr-map.ts';
import { readLetter } from '../src/web/pipeline.ts';
import { initialValues, toStored } from '../src/web/letter.ts';
import type { Draft } from '../src/web/letter.ts';
import { factsOf } from '../src/web/letter.ts';
import { timelines } from '../src/web/content.ts';
import { forecastLetters, secondChancesFor } from '../src/carta/lib/timelines.ts';
import { localMsToIso } from '../src/carta/lib/dates.ts';

const site = resolve(__dirname, '..');
const load = (id: string) =>
  recordedToOcr(JSON.parse(readFileSync(join(site, `public/samples/${id}.jpg.json`), 'utf8')) as RecordedVisionOcr);
const truth = JSON.parse(readFileSync(join(site, 'tests/fixtures/carta/ground_truth.json'), 'utf8')) as {
  notices: { file: string; fields: Record<string, unknown> }[];
};
const truthFor = (file: string) => truth.notices.find((n) => n.file === file)?.fields ?? {};

function draftFor(id: string): Draft {
  const read = readLetter(load(id), Date.UTC(2026, 9, 6));
  return {
    source: 'sample',
    sampleId: id,
    engine: 'apple-vision-recorded',
    photoUrl: `samples/${id}.jpg`,
    lines: read.ocr.lines,
    redactedText: read.redactedText,
    extracted: read.extraction.fields,
    requiredDocs: read.extraction.requiredDocs ?? [],
    containedSsn: read.containedSsn,
    upsideDown: read.upsideDown,
  };
}

describe('the bundled SAR 7 sample', () => {
  const read = readLetter(load('sar7-clean-01'), Date.UTC(2026, 9, 6));

  it('extracts its deadline, September 5, 2026, the date printed on the letter', () => {
    expect(read.extraction.fields.deadlineDate?.value).toBe('2026-09-05');
    expect(read.extraction.fields.deadlineDate?.value).toBe(truthFor('01-sar7-en.pdf')['deadline_date']);
  });

  it('reads it as a SAR 7 renewal for CalFresh, and finds the papers it asks for', () => {
    expect(read.extraction.fields.formId?.value).toBe('SAR 7');
    expect(read.extraction.fields.actionType?.value).toBe('recert_due');
    expect(read.extraction.requiredDocs).toEqual(expect.arrayContaining(['pay_stub', 'utility_bill', 'lease_or_rent_receipt']));
  });

  it('forecasts the CalFresh renewal notice for February 2027 once saved', () => {
    const draft = draftFor('sar7-clean-01');
    const letter = toStored(draft, initialValues(draft.extracted), 'recert_due', 0, 'test');
    const [forecast] = forecastLetters(factsOf(letter), timelines.expectedLetters);
    expect(forecast?.rule.id).toBe('calfresh_renewal_after_sar7');
    expect(localMsToIso(forecast?.expectFromMs ?? 0)).toBe('2027-02-01');
  });
});

describe('every bundled sample', () => {
  const samples: [string, string][] = [
    ['sar7-clean-01', '01-sar7-en.pdf'],
    ['na960x-clean-06', '02-na960x-discontinuance-en.pdf'],
    ['cf3776-clean-10', '03-cf377-6-verification-en.pdf'],
    ['mc210-clean-12', '04-mc210rv-redetermination-en.pdf'],
  ];
  const keys: [string, string][] = [
    ['deadlineDate', 'deadline_date'],
    ['noticeDate', 'notice_date'],
    ['effectiveDate', 'effective_date'],
    ['aidPaidPendingDeadline', 'aid_paid_pending_deadline'],
    ['appealDeadline', 'appeal_deadline'],
  ];
  for (const [id, file] of samples) {
    it(`${id}: every date it fills in is the date on the letter (blank is allowed, wrong is not)`, () => {
      const fields = readLetter(load(id), 0).extraction.fields as Record<string, { value?: string } | undefined>;
      for (const [field, truthKey] of keys) {
        const got = fields[field]?.value;
        if (got !== undefined) expect(got, `${id} ${field}`).toBe(truthFor(file)[truthKey]);
      }
    });
  }

  it('the stop notice (NA 960X) gets its second-chance dates from timelines.json', () => {
    const draft = draftFor('na960x-clean-06');
    const letter = toStored(draft, initialValues(draft.extracted), 'discontinuance', 0, 'test');
    const chances = secondChancesFor(factsOf(letter), timelines.secondChances, new Date(2026, 8, 8).getTime());
    const byId = Object.fromEntries(chances.map((c) => [c.rule.id, localMsToIso(c.dateMs)]));
    // Effective (stop) date 2026-09-30, plus 30 days: the CalFresh restore window.
    expect(byId['calfresh_restore_after_stop']).toBe('2026-10-30');
    for (const c of chances) expect(c.rule.sourceUrl).toMatch(/^https:\/\//);
  });
});
