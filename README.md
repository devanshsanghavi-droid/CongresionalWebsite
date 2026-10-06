# Carta: the website and the web version

**Carta reads benefit letters for families on CalFresh and Medi-Cal so they
don't miss a deadline.**

Congressional App Challenge 2026 · CA-16 · Devansh Sanghavi

This repository is the public website for [Carta](https://github.com/devanshsanghavi-droid/Congressional_App_Challenge),
an iPhone app, and a **working web version of Carta** that runs the app's own
letter-reading code in the browser.

Live at **https://devanshsanghavi-droid.github.io/CongresionalWebsite/**

| Page | What it is |
|---|---|
| `/` | The landing page: the problem, what the iPhone app does, how it is built, privacy, platforms, about. |
| `/try/` | **Try Carta**: add a letter (a bundled sample, or a photo you take or choose), check what Carta read, save it, and see the countdown, what to do, the reminder dates, the second-chance dates and the letters on the way. |

Carta is not legal advice and never contacts any agency.

---

## What the web version does

1. **Add a letter.** Pick one of four bundled sample letters (fictional notices
   from Carta's test set, printed and photographed), or take or choose a photo.
   A photo is read **in the browser** by [Tesseract.js](https://github.com/naptha/tesseract.js),
   whose worker, WebAssembly engine and English and Spanish models are all
   served by this site. Nothing is ever loaded from a CDN.
2. **Redact.** Carta's own redactor removes anything shaped like a Social
   Security number from the text before anything else sees it.
3. **Extract.** Carta's own extraction code (`extract()`, the "island") finds
   the dates, the programme, the form, the name and the case number.
4. **Check what Carta read.** Every field is shown and editable. The name and
   the case number are flagged "Please check this", as in the app, because they
   fail in ways that still look right. Focusing a field outlines where it was
   read on the photo. Nothing is kept until Save.
5. **Your notices.** Each saved letter leads with its countdown, in Carta's
   tiers and colours (green above 14 days, amber 3 to 14, red below 3).
6. **A letter.** What it says, what to do and by when; the reminder ladder
   (30, 14, 7, 3, 1 days before and on the day, plus the hearing reminders);
   **"Add reminders to my calendar"**, which downloads an `.ics` file with one
   event per reminder; **"If your benefits stop"**, the second-chance dates from
   Carta's `timelines.json`, each with its rule word for word, its source and
   "ask your county to confirm"; and **"Letters on the way"**, the forecast of
   the next letter, with "Did it come?" when it is late.
7. **Delete everything** removes every key this site wrote to the browser.

The sample letters are dated September 2026. Rather than quietly faking the
clock, a sample shows **"Shown as if today were …"**, with a date control and a
"Use today's real date" button. Letters you add yourself always use the real
date.

## Honest differences from the iPhone app

| | iPhone app | Web version |
|---|---|---|
| Reading the photo | Apple Vision, on the phone | Tesseract.js, in the browser |
| Extraction, redaction, countdown tiers, reminder ladder, second-chance dates, letter forecast | Carta's code | **The same code**, copied by the sync script below |
| Plain-language explanation | Optional on-device AI model (Qwen2.5 1.5B) | **None.** No model runs in the browser |
| Reminders | Local notifications (9 am by default) | **A calendar file** (`.ics`) you add to your own calendar, at a time you set |
| Storage | SQLite on the phone; letter text and name encrypted (AES-256-GCM, key in the keychain) | This browser's `localStorage`, **not encrypted**. No SSN, no full case number (last four digits only, and masked in the stored words), no photo. The Review screen says this before Save |
| Upside-down page | "Turn the page around" | The same check and message |
| Form check, phone-to-phone hand-off, checklist, Where to go, onboarding | Yes | No |

**How much worse is Tesseract?** Measured, in [`measurements/tesseract-vs-vision.md`](measurements/tesseract-vs-vision.md)
(`npm run measure:tesseract`). Carta's extraction ran on both readers' text for
the same photos and was scored against the corpus ground truth:

- **The four bundled samples** (flat, well lit): both readers 30 right, 0 wrong,
  1 missed.
- **All 23 real photos in Carta's corpus** (dim, angled, creased, shadowed, one
  upside down): Apple Vision 150 right, 4 wrong, 22 missed; Tesseract 119 right,
  1 wrong, 56 missed. Dates only: Apple Vision 47 / 1 / 14, Tesseract 38 / 0 / 24.

So in this measurement Tesseract leaves many more fields blank for the person to
fill in, and rarely gets one wrong. These are small counts, not rates, and they
were measured in Node; in the browser the photo is drawn onto a canvas first, so
results can differ slightly.

One adaptation made this possible, and it is in this site's code, not Carta's:
Tesseract joins everything on a printed row into one line
(`MARIA REYES  Case Number: 01-4472-9931`), where Apple Vision returns two.
`src/web/ocr-map.ts` splits a Tesseract line at a gap wider than 2.5 word-heights,
so the island receives one line per run of text, as it does from Apple Vision.
Before the split, Tesseract found no recipient name on any of the four samples.
The split was designed looking at sample 01 only.

## Privacy by construction

- **No backend, no analytics, no cookies, no third-party requests.** System
  fonts. Every script, stylesheet, image, model and worker is served by this
  site.
- **Content-Security-Policy.** Every page carries a CSP meta tag that allows
  only the site's own origin (plus `blob:`/`data:` and `'wasm-unsafe-eval'`,
  which the in-browser reader needs). So the browser itself blocks a request to
  anywhere else, even one made by mistake. The reader's worker starts from a
  `blob:` URL and therefore inherits the same policy. The policy is in
  `vite.config.ts` and is injected at build time (Vite's dev server needs inline
  scripts and a websocket, which it would block).
- **Tested.** `tests/dist-origins.test.ts` builds the site and fails if a page
  lacks the CSP, if any HTML attribute or stylesheet points off-site, if any CDN
  or analytics host appears in any file (including the self-hosted reader, whose
  CDN fallbacks `scripts/copy-ocr-assets.mjs` removes), or if any absolute URL
  is left that is not one of: an XML namespace name, a link inside an error
  message, a licence text, or a link a person can choose to follow (the GitHub
  repositories and the sources of the second-chance rules).
- On GitHub Pages, "the site's own origin" is `devanshsanghavi-droid.github.io`,
  which GitHub shares between this account's Pages sites.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173/CongresionalWebsite/
npm test             # Vitest: 300 tests
npm run build        # typecheck (three projects) + production build into dist/
npm run preview      # serve dist/ with the CSP in force
```

Node 22.18 or later. `npm run dev`, `npm test` and `npm run build` first copy
the reader into `public/ocr/` from the pinned npm packages
(`scripts/copy-ocr-assets.mjs`); that folder is not committed.

Deployment: `.github/workflows/pages.yml` tests, builds and publishes `dist/` to
GitHub Pages on every push to `main`. The repository's Pages source must be set
to "GitHub Actions" once, in Settings → Pages.

The demo video stays hidden until a URL is set in `DEMO_VIDEO_URL` in
`src/config.ts`. A file on this site is played in the page; a YouTube or Vimeo
URL is shown as a link, because embedding another site's player would break the
privacy policy above.

## How the sync works

The web version does not reimplement Carta. It runs Carta's own files, copied
into `src/carta/` by `scripts/sync-from-carta.mjs` from a sibling checkout of the
app:

```bash
npm run sync                                  # ../Congressional_App_Challenge at HEAD
node scripts/sync-from-carta.mjs --commit <sha>
node scripts/sync-from-carta.mjs --carta <dir>
```

- It reads every file with `git show <commit>:<path>`, never from the working
  tree, so the commit in the stamp is the commit the bytes came from.
- It copies, unchanged: the whole extraction island (`src/extraction/*.ts` and
  its `tsconfig.json`), and `src/lib/dates.ts`, `urgency.ts`, `timelines.ts`,
  `content/{types,parse,validate}.ts`, `extraction-port/{port,adapter}.ts`,
  `ocr/{types,orientation}.ts`, `theme/tokens.ts`, the app's English and Spanish
  string files, `content/timelines.json` and `content/doc_types.json`, plus four
  sample photos with their recorded Apple Vision OCR, the corpus ground truth
  (for tests only) and the app's four marketing screenshots (resized to 720px
  JPEGs with macOS `sips`; `--skip-screenshots` elsewhere).
- Each `.ts` file gets a header naming its Carta source path, the Carta commit
  and the SHA-256 of the source bytes. JSON and images cannot carry a comment,
  so every file, stamped or not, is also listed in `src/carta/SYNC-MANIFEST.json`.
- It empties its destination folders first, and its output has no timestamps:
  running it twice against the same commit produces no diff.
- `tests/vendor.test.ts` re-derives every stamp from the bytes on disk, fails on
  any file under `src/carta` the sync did not write, checks that the island
  imports only itself, and, when a Carta checkout with that commit sits beside
  this repo, compares every file byte for byte with Carta.

The copy is committed, so this repository builds on its own.

### Adaptations

**None to Carta's files.** The app's directory layout is kept under `src/carta/`
(`src/extraction` → `src/carta/extraction`, `src/lib` → `src/carta/lib`,
`content` → `src/carta/content`), so every relative import resolves unchanged,
and this project compiles them under the same strict settings the app uses. The
island is also typechecked with its own `tsconfig.json` (`lib: ["ES2022"]`,
`types: []`: no DOM, so no `fetch`).

What the web version does around them, in its own code (`src/web/`):

- `content.ts` parses the two content packs with Carta's own parser instead of
  importing the app's `content/index.ts`, which also loads form-check templates
  the web version does not use.
- `ocr-map.ts` maps Tesseract's output to Carta's `OcrLine` shape (boxes
  normalised 0-1, top-left origin) and splits column-joined lines (above).
- `content.ts` maps the island's document id `lease_or_rent_receipt` to the
  vocabulary entry `rent_receipt` ("Rent receipt or lease"), and words
  `proof_of_residency` itself. The app currently shows those two raw ids.
- `reminders.ts` composes reminder text from the app's notification strings, as
  the app's `reminder-content.ts` does (which is not vendored, because it imports
  the app's i18next instance).

## Tests

`npm test` runs 300 tests in 9 files (Vitest, pinned to the America/Los_Angeles
timezone; `tests/timezone.test.ts` proves the pin works):

- `vendor.test.ts`: every vendored file matches its stamp (above).
- `samples.test.ts`: the bundled SAR 7 extracts its deadline, September 5,
  2026; every date any sample fills in is the date on the letter; the stop notice
  gets its second-chance dates and the SAR 7 its February 2027 forecast.
- `ics.test.ts`: a November 5, 2026 deadline puts reminders on both sides of the
  November 1 daylight-saving change, and every one is 9:00 local; floating local
  times, UTC `DTSTAMP`, CRLF, 75-octet folding that never splits a character.
- `store.test.ts`: SSNs in several shapes are gone from the bytes actually
  written to storage; the case number is kept as its last four digits only; an
  SSN typed on Review is removed; a record with an SSN anywhere is refused
  outright; "Delete everything" removes this site's keys and nothing else.
- `dist-origins.test.ts`: the privacy check on a fresh production build (above).
- `ocr-map.test.ts`, `i18n.test.ts` (every string used exists in English and
  Spanish), `tokens.test.ts` (the CSS colours are Carta's), `timezone.test.ts`.

## Languages

English and Spanish. Wherever the web version says what the app says, it uses
the app's own strings, vendored unchanged, so the Spanish is the Spanish the app
was reviewed with. Strings only the web version needs are in `src/web/i18n.ts`;
**their Spanish is Carta's own translation**, not an official agency
translation, and has not yet had a fluent speaker's review. The landing page is
English only.

## Accessibility

Semantic HTML, a skip link, labelled controls, visible focus, focus moved to the
heading on every screen change, 17px body text, controls at least 44px tall,
countdowns that always pair the colour with the number and the words, and the
app's colours, which were chosen for WCAG AA contrast on its background. It is
built to work with a keyboard and a screen reader and is laid out for a phone
first. It has been checked in a desktop browser and at phone width; it has not
yet been tested with VoiceOver or another screen reader.

## AI-assistance disclosure

Two separate things, as in the app's README.

1. **The product.** The iPhone app runs a small language model on the phone to
   rewrite letters in plain words. That is a feature. The web version runs no
   model.
2. **The code.** This website, like the app, was written with AI assistance:
   Claude Code was used throughout, including the sync script, the web version
   and the tests. Design decisions, priorities, scope and product judgement were
   the author's; the implementation is substantially AI-written.

## Licences

The vendored Carta code is from the [Carta repository](https://github.com/devanshsanghavi-droid/Congressional_App_Challenge).
Tesseract.js and tesseract.js-core are Apache 2.0; their licence texts are
served with the reader at `ocr/LICENSES/`. The English and Spanish models come
from Tesseract's `tessdata_best` (Apache 2.0), as packaged in
`@tesseract.js-data` (MIT, `best_int` builds).
