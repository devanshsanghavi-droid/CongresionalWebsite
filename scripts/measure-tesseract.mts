/**
 * How much worse is the web version's reader? Measured, not guessed.
 *
 *   npm run measure:tesseract
 *
 * For each photo, run Carta's own extraction twice:
 *   1. on the Apple Vision OCR recorded when Carta's corpus was built (the
 *      iPhone app's reader, run on a Mac), and
 *   2. on Tesseract's OCR of the same photo, with the same engine build and the
 *      same language models this site serves (public/ocr/), mapped to Carta's
 *      line shape by src/web/ocr-map.ts exactly as the site does,
 * then score both against the corpus ground truth, field by field.
 *
 * Two sets, never merged:
 *   - the four sample photos this site ships (always available), and
 *   - all 23 real photos in Carta's corpus, when a Carta checkout sits beside
 *     this one (../Congressional_App_Challenge). Those photos are not shipped.
 *
 * Writes measurements/tesseract-vs-vision.md. No timestamps or durations go in
 * the file, so re-running it produces no diff unless a result changed.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorker, OEM } from 'tesseract.js';
import { pageToOcr, recordedToOcr } from '../src/web/ocr-map.ts';
import type { RecordedVisionOcr, TesseractPageLike } from '../src/web/ocr-map.ts';
import { readLetter } from '../src/web/pipeline.ts';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const carta = resolve(site, '..', 'Congressional_App_Challenge');

/** Photo name prefix -> the corpus notice it shows (Carta's tools/corpus/MANIFEST.md). */
const NOTICE_BY_PREFIX: Record<string, string> = {
  sar7: '01-sar7-en.pdf',
  na960x: '02-na960x-discontinuance-en.pdf',
  cf3776: '03-cf377-6-verification-en.pdf',
  mc210: '04-mc210rv-redetermination-en.pdf',
  na960y: '05-na960y-reduction-en.pdf',
  sar7es: '06-sar7-es.pdf',
  bilingual: '07-na960x-bilingual.pdf',
  ssa: '08-ssa-redetermination-en.pdf',
  hcv: '09-hcv-annual-recert-en.pdf',
};

/** Ground-truth key -> Carta field. Only fields the extractor is meant to fill. */
const FIELDS: readonly [string, string][] = [
  ['deadline_date', 'deadlineDate'],
  ['notice_date', 'noticeDate'],
  ['effective_date', 'effectiveDate'],
  ['aid_paid_pending_deadline', 'aidPaidPendingDeadline'],
  ['appeal_deadline', 'appealDeadline'],
  ['recipient_name', 'recipientName'],
  ['case_number', 'caseNumber'],
  ['program', 'programId'],
  ['action_type', 'actionType'],
  ['form_id', 'formId'],
];

const DATE_FIELDS = new Set(['deadlineDate', 'noticeDate', 'effectiveDate', 'aidPaidPendingDeadline', 'appealDeadline']);

interface Truth {
  file: string;
  form_id: string;
  program: string;
  action_type: string;
  language: string;
  fields: Record<string, unknown>;
}

const truthAll = JSON.parse(readFileSync(join(site, 'tests/fixtures/carta/ground_truth.json'), 'utf8')) as {
  notices: Truth[];
};

function expected(truth: Truth, key: string): string | undefined {
  const top: Record<string, string> = { form_id: truth.form_id, program: truth.program, action_type: truth.action_type };
  const v = top[key] ?? truth.fields[key];
  return typeof v === 'string' ? v : undefined;
}

type Outcome = 'right' | 'wrong' | 'missed' | 'blank-ok' | 'invented';

function score(truth: string | undefined, got: string | undefined): Outcome {
  if (truth === undefined) return got === undefined ? 'blank-ok' : 'invented';
  if (got === undefined) return 'missed';
  return got.trim().toUpperCase() === truth.trim().toUpperCase() ? 'right' : 'wrong';
}

interface Tally {
  right: number;
  wrong: number;
  missed: number;
  invented: number;
}
const tally = (): Tally => ({ right: 0, wrong: 0, missed: 0, invented: 0 });

interface Photo {
  id: string;
  jpg: string;
  vision: string;
}

const workers = {
  eng: await createWorker(['eng'], OEM.LSTM_ONLY, { langPath: join(site, 'public/ocr/lang'), cacheMethod: 'none' }),
  both: await createWorker(['eng', 'spa'], OEM.LSTM_ONLY, { langPath: join(site, 'public/ocr/lang'), cacheMethod: 'none' }),
};

async function measure(photos: readonly Photo[]) {
  const rows: string[] = [];
  const all = { vision: tally(), tesseract: tally() };
  const dates = { vision: tally(), tesseract: tally() };
  for (const photo of photos) {
    const prefix = photo.id.split('-')[0] ?? '';
    const truth = truthAll.notices.find((n) => n.file === NOTICE_BY_PREFIX[prefix]);
    if (!truth) throw new Error(`no ground truth for ${photo.id}`);
    const recorded = JSON.parse(readFileSync(photo.vision, 'utf8')) as RecordedVisionOcr & {
      sourceWidth: number;
      sourceHeight: number;
    };
    const vision = readLetter(recordedToOcr(recorded), 0).extraction.fields as Record<string, { value?: string } | undefined>;

    // The site asks the person which language the letter is in; this uses the right answer.
    const worker = truth.language === 'en' ? workers.eng : workers.both;
    const result = await worker.recognize(photo.jpg, {}, { blocks: true, text: true });
    const ocr = pageToOcr(result.data as unknown as TesseractPageLike, recorded.sourceWidth, recorded.sourceHeight, 'tesseract.js');
    const tess = readLetter(ocr, 0).extraction.fields as Record<string, { value?: string } | undefined>;

    for (const [truthKey, field] of FIELDS) {
      const want = expected(truth, truthKey);
      const v = score(want, vision[field]?.value);
      const t = score(want, tess[field]?.value);
      if (v === 'blank-ok' && t === 'blank-ok') continue;
      for (const [engine, outcome] of [['vision', v], ['tesseract', t]] as const) {
        if (outcome === 'blank-ok') continue;
        all[engine][outcome] += 1;
        if (DATE_FIELDS.has(field)) dates[engine][outcome] += 1;
      }
      const shown = (o: Outcome, got: string | undefined) => (o === 'wrong' || o === 'invented' ? `${o} (\`${got ?? ''}\`)` : o);
      rows.push(
        `| ${photo.id} | ${field} | ${want ?? '(not on the letter)'} | ${shown(v, vision[field]?.value)} | ${shown(t, tess[field]?.value)} |`,
      );
    }
  }
  return { rows, all, dates };
}

const line = (name: string, x: Tally) => `| ${name} | ${x.right} | ${x.wrong} | ${x.invented} | ${x.missed} |`;

function section(title: string, intro: string, r: Awaited<ReturnType<typeof measure>>, count: number): string {
  return `## ${title}

${intro}

**All fields, ${count} photos**

| Reader | right | wrong | made up | missed |
|---|---|---|---|---|
${line('Apple Vision (recorded)', r.all.vision)}
${line('Tesseract', r.all.tesseract)}

**Dates only** (what Carta counts down to and schedules from)

| Reader | right | wrong | made up | missed |
|---|---|---|---|---|
${line('Apple Vision (recorded)', r.dates.vision)}
${line('Tesseract', r.dates.tesseract)}

<details><summary>Field by field</summary>

| Photo | Field | On the letter | Apple Vision | Tesseract |
|---|---|---|---|---|
${r.rows.join('\n')}

</details>
`;
}

const SAMPLE_IDS = ['sar7-clean-01', 'na960x-clean-06', 'cf3776-clean-10', 'mc210-clean-12'];
const samples = await measure(
  SAMPLE_IDS.map((id) => ({
    id,
    jpg: join(site, `public/samples/${id}.jpg`),
    vision: join(site, `public/samples/${id}.jpg.json`),
  })),
);

let corpusSection = `## All 23 real photos in Carta's corpus

Not measured: no Carta checkout was found at \`${carta}\`.
`;
const corpusPhotos = join(carta, 'tools/corpus/photos');
if (existsSync(corpusPhotos)) {
  const ids = Object.keys(NOTICE_BY_PREFIX)
    .flatMap((prefix) =>
      readFileSync(join(carta, 'tools/corpus/MANIFEST.md'), 'utf8')
        .match(new RegExp(`\`(${prefix}-[a-z]+-\\d{2})\\.jpg\``, 'g'))
        ?.map((m) => m.replace(/`/g, '').replace(/\.jpg$/, '')) ?? [],
    )
    .filter((id, i, all) => all.indexOf(id) === i && existsSync(join(corpusPhotos, `${id}.jpg`)))
    .sort();
  const corpus = await measure(
    ids.map((id) => ({
      id,
      jpg: join(corpusPhotos, `${id}.jpg`),
      vision: join(carta, `tools/corpus/ocr/apple-vision/${id}.jpg.json`),
    })),
  );
  corpusSection = section(
    `All ${ids.length} real photos in Carta's corpus`,
    `Printed fictional notices photographed on an iPhone: flat, dim, angled, creased, shadowed, one upside down. Read from the Carta checkout beside this one; these photos are not shipped with the site. The column split in src/web/ocr-map.ts was designed while looking at sample 01's lines only, so the other photos here are a fairer test of it.`,
    corpus,
    ids.length,
  );
}

await workers.eng.terminate();
await workers.both.terminate();

const version = JSON.parse(readFileSync(join(site, 'node_modules/tesseract.js/package.json'), 'utf8')).version;
const out = `# Tesseract (web version) against Apple Vision (iPhone app)

Written by \`npm run measure:tesseract\` (scripts/measure-tesseract.mts). Do not edit by hand.

Carta's own extraction code ran on both. The only difference is the reader that
turned the photo into text: Apple Vision (recorded on a Mac when Carta's corpus
was built) or Tesseract (tesseract.js ${version}, \`best_int\` models, the files
this site serves). Scored against the corpus ground truth.

How to read it:

- **These are small counts, not rates.** Real captures and the four samples are
  reported separately and never added together.
- **A wrong value is worse than a missed one.** A missed field is an empty box
  on Review that the person fills in; a wrong one has to be caught by the person
  checking.
- **Tesseract runs in Node here** and decodes the JPEG itself; in the browser the
  page draws the photo onto a canvas first, so the site's results can differ
  slightly. Apple Vision was run on a Mac, not on an iPhone.
- Both readers are given the letter's language as the site asks the person for
  it: English, or English and Spanish for the Spanish and bilingual notices.

${section('The four sample photos on this site', 'All flat and well lit.', samples, SAMPLE_IDS.length)}
${corpusSection}`;

mkdirSync(join(site, 'measurements'), { recursive: true });
writeFileSync(join(site, 'measurements/tesseract-vs-vision.md'), out);
console.log(out.split('<details>')[0]);
