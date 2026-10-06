# Tesseract (web version) against Apple Vision (iPhone app)

Written by `npm run measure:tesseract` (scripts/measure-tesseract.mts). Do not edit by hand.

Carta's own extraction code ran on both. The only difference is the reader that
turned the photo into text: Apple Vision (recorded on a Mac when Carta's corpus
was built) or Tesseract (tesseract.js 7.0.0, `best_int` models, the files
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

## The four sample photos on this site

All flat and well lit.

**All fields, 4 photos**

| Reader | right | wrong | made up | missed |
|---|---|---|---|---|
| Apple Vision (recorded) | 30 | 0 | 0 | 1 |
| Tesseract | 30 | 0 | 0 | 1 |

**Dates only** (what Carta counts down to and schedules from)

| Reader | right | wrong | made up | missed |
|---|---|---|---|---|
| Apple Vision (recorded) | 10 | 0 | 0 | 1 |
| Tesseract | 10 | 0 | 0 | 1 |

<details><summary>Field by field</summary>

| Photo | Field | On the letter | Apple Vision | Tesseract |
|---|---|---|---|---|
| sar7-clean-01 | deadlineDate | 2026-09-05 | right | right |
| sar7-clean-01 | recipientName | MARIA REYES | right | right |
| sar7-clean-01 | caseNumber | 01-4472-9931 | right | right |
| sar7-clean-01 | programId | CalFresh/CalWORKs | right | right |
| sar7-clean-01 | actionType | recert_due | right | right |
| sar7-clean-01 | formId | SAR 7 | right | right |
| na960x-clean-06 | deadlineDate | 2026-09-30 | missed | missed |
| na960x-clean-06 | noticeDate | 2026-09-08 | right | right |
| na960x-clean-06 | effectiveDate | 2026-09-30 | right | right |
| na960x-clean-06 | aidPaidPendingDeadline | 2026-09-18 | right | right |
| na960x-clean-06 | appealDeadline | 2026-12-07 | right | right |
| na960x-clean-06 | recipientName | MARIA REYES | right | right |
| na960x-clean-06 | caseNumber | 01-4472-9931 | right | right |
| na960x-clean-06 | programId | CalFresh | right | right |
| na960x-clean-06 | actionType | discontinuance | right | right |
| na960x-clean-06 | formId | NA 960X SAR | right | right |
| cf3776-clean-10 | deadlineDate | 2026-09-28 | right | right |
| cf3776-clean-10 | noticeDate | 2026-09-14 | right | right |
| cf3776-clean-10 | recipientName | DAVID OKONKWO | right | right |
| cf3776-clean-10 | caseNumber | 01-8813-2205 | right | right |
| cf3776-clean-10 | programId | CalFresh | right | right |
| cf3776-clean-10 | actionType | info_request | right | right |
| cf3776-clean-10 | formId | CF 377.6 | right | right |
| mc210-clean-12 | deadlineDate | 2026-10-15 | right | right |
| mc210-clean-12 | noticeDate | 2026-09-01 | right | right |
| mc210-clean-12 | effectiveDate | 2026-10-31 | right | right |
| mc210-clean-12 | recipientName | ANH TRAN | right | right |
| mc210-clean-12 | caseNumber | 40-2291-7734 | right | right |
| mc210-clean-12 | programId | Medi-Cal | right | right |
| mc210-clean-12 | actionType | recert_due | right | right |
| mc210-clean-12 | formId | MC 210 RV | right | right |

</details>

## All 23 real photos in Carta's corpus

Printed fictional notices photographed on an iPhone: flat, dim, angled, creased, shadowed, one upside down. Read from the Carta checkout beside this one; these photos are not shipped with the site. The column split in src/web/ocr-map.ts was designed while looking at sample 01's lines only, so the other photos here are a fairer test of it.

**All fields, 23 photos**

| Reader | right | wrong | made up | missed |
|---|---|---|---|---|
| Apple Vision (recorded) | 150 | 4 | 0 | 22 |
| Tesseract | 119 | 1 | 0 | 56 |

**Dates only** (what Carta counts down to and schedules from)

| Reader | right | wrong | made up | missed |
|---|---|---|---|---|
| Apple Vision (recorded) | 47 | 1 | 0 | 14 |
| Tesseract | 38 | 0 | 0 | 24 |

<details><summary>Field by field</summary>

| Photo | Field | On the letter | Apple Vision | Tesseract |
|---|---|---|---|---|
| bilingual-clean-18 | noticeDate | 2026-10-02 | right | right |
| bilingual-clean-18 | effectiveDate | 2026-11-01 | missed | missed |
| bilingual-clean-18 | aidPaidPendingDeadline | 2026-10-12 | right | right |
| bilingual-clean-18 | appealDeadline | 2026-12-31 | right | right |
| bilingual-clean-18 | recipientName | JOSE RAMIREZ | right | right |
| bilingual-clean-18 | caseNumber | 01-9917-3320 | right | right |
| bilingual-clean-18 | programId | CalFresh | right | right |
| bilingual-clean-18 | actionType | discontinuance | right | right |
| bilingual-clean-18 | formId | NA 960X SAR | right | right |
| bilingual-creased-21 | noticeDate | 2026-10-02 | right | right |
| bilingual-creased-21 | effectiveDate | 2026-11-01 | missed | missed |
| bilingual-creased-21 | aidPaidPendingDeadline | 2026-10-12 | right | right |
| bilingual-creased-21 | appealDeadline | 2026-12-31 | right | right |
| bilingual-creased-21 | recipientName | JOSE RAMIREZ | right | right |
| bilingual-creased-21 | caseNumber | 01-9917-3320 | right | right |
| bilingual-creased-21 | programId | CalFresh | right | right |
| bilingual-creased-21 | actionType | discontinuance | right | right |
| bilingual-creased-21 | formId | NA 960X SAR | right | right |
| bilingual-creased-24 | noticeDate | 2026-10-02 | right | right |
| bilingual-creased-24 | effectiveDate | 2026-11-01 | missed | missed |
| bilingual-creased-24 | aidPaidPendingDeadline | 2026-10-12 | right | right |
| bilingual-creased-24 | appealDeadline | 2026-12-31 | right | right |
| bilingual-creased-24 | recipientName | JOSE RAMIREZ | right | missed |
| bilingual-creased-24 | caseNumber | 01-9917-3320 | right | right |
| bilingual-creased-24 | programId | CalFresh | right | right |
| bilingual-creased-24 | actionType | discontinuance | right | right |
| bilingual-creased-24 | formId | NA 960X SAR | right | right |
| cf3776-blur-11 | deadlineDate | 2026-09-28 | right | right |
| cf3776-blur-11 | noticeDate | 2026-09-14 | missed | missed |
| cf3776-blur-11 | recipientName | DAVID OKONKWO | missed | missed |
| cf3776-blur-11 | caseNumber | 01-8813-2205 | wrong (`01-8313-2205`) | missed |
| cf3776-blur-11 | programId | CalFresh | right | right |
| cf3776-blur-11 | actionType | info_request | right | missed |
| cf3776-blur-11 | formId | CF 377.6 | missed | missed |
| cf3776-clean-10 | deadlineDate | 2026-09-28 | right | right |
| cf3776-clean-10 | noticeDate | 2026-09-14 | right | right |
| cf3776-clean-10 | recipientName | DAVID OKONKWO | right | right |
| cf3776-clean-10 | caseNumber | 01-8813-2205 | right | right |
| cf3776-clean-10 | programId | CalFresh | right | right |
| cf3776-clean-10 | actionType | info_request | right | right |
| cf3776-clean-10 | formId | CF 377.6 | right | right |
| cf3776-creased-23 | deadlineDate | 2026-09-28 | right | right |
| cf3776-creased-23 | noticeDate | 2026-09-14 | right | right |
| cf3776-creased-23 | recipientName | DAVID OKONKWO | right | missed |
| cf3776-creased-23 | caseNumber | 01-8813-2205 | right | right |
| cf3776-creased-23 | programId | CalFresh | right | right |
| cf3776-creased-23 | actionType | info_request | right | right |
| cf3776-creased-23 | formId | CF 377.6 | right | right |
| hcv-angled-20 | deadlineDate | 2026-10-06 | missed | missed |
| hcv-angled-20 | noticeDate | 2026-08-20 | right | right |
| hcv-angled-20 | effectiveDate | 2026-12-01 | missed | missed |
| hcv-angled-20 | recipientName | PATRICIA NGUYEN | right | right |
| hcv-angled-20 | caseNumber | HCV-33812 | right | right |
| hcv-angled-20 | programId | Housing Choice Voucher | missed | missed |
| hcv-angled-20 | actionType | recert_due | right | right |
| hcv-angled-20 | formId | HCV-AR-101 | missed | missed |
| mc210-clean-12 | deadlineDate | 2026-10-15 | right | right |
| mc210-clean-12 | noticeDate | 2026-09-01 | right | right |
| mc210-clean-12 | effectiveDate | 2026-10-31 | right | right |
| mc210-clean-12 | recipientName | ANH TRAN | right | right |
| mc210-clean-12 | caseNumber | 40-2291-7734 | right | right |
| mc210-clean-12 | programId | Medi-Cal | right | right |
| mc210-clean-12 | actionType | recert_due | right | right |
| mc210-clean-12 | formId | MC 210 RV | right | right |
| mc210-creased-22 | deadlineDate | 2026-10-15 | right | missed |
| mc210-creased-22 | noticeDate | 2026-09-01 | right | missed |
| mc210-creased-22 | effectiveDate | 2026-10-31 | right | missed |
| mc210-creased-22 | recipientName | ANH TRAN | wrong (`ANN TRAN`) | missed |
| mc210-creased-22 | caseNumber | 40-2291-7734 | right | right |
| mc210-creased-22 | programId | Medi-Cal | right | missed |
| mc210-creased-22 | actionType | recert_due | right | missed |
| mc210-creased-22 | formId | MC 210 RV | right | right |
| mc210-dimangle-13 | deadlineDate | 2026-10-15 | right | missed |
| mc210-dimangle-13 | noticeDate | 2026-09-01 | missed | missed |
| mc210-dimangle-13 | effectiveDate | 2026-10-31 | wrong (`2026-09-01`) | missed |
| mc210-dimangle-13 | recipientName | ANH TRAN | wrong (`AN TRAN`) | wrong (`ANN TRAN`) |
| mc210-dimangle-13 | caseNumber | 40-2291-7734 | right | missed |
| mc210-dimangle-13 | programId | Medi-Cal | right | right |
| mc210-dimangle-13 | actionType | recert_due | right | missed |
| mc210-dimangle-13 | formId | MC 210 RV | right | missed |
| na960x-angled-08 | deadlineDate | 2026-09-30 | missed | missed |
| na960x-angled-08 | noticeDate | 2026-09-08 | missed | missed |
| na960x-angled-08 | effectiveDate | 2026-09-30 | missed | missed |
| na960x-angled-08 | aidPaidPendingDeadline | 2026-09-18 | right | missed |
| na960x-angled-08 | appealDeadline | 2026-12-07 | missed | missed |
| na960x-angled-08 | recipientName | MARIA REYES | missed | missed |
| na960x-angled-08 | caseNumber | 01-4472-9931 | right | missed |
| na960x-angled-08 | programId | CalFresh | right | missed |
| na960x-angled-08 | actionType | discontinuance | right | missed |
| na960x-angled-08 | formId | NA 960X SAR | right | missed |
| na960x-clean-06 | deadlineDate | 2026-09-30 | missed | missed |
| na960x-clean-06 | noticeDate | 2026-09-08 | right | right |
| na960x-clean-06 | effectiveDate | 2026-09-30 | right | right |
| na960x-clean-06 | aidPaidPendingDeadline | 2026-09-18 | right | right |
| na960x-clean-06 | appealDeadline | 2026-12-07 | right | right |
| na960x-clean-06 | recipientName | MARIA REYES | right | right |
| na960x-clean-06 | caseNumber | 01-4472-9931 | right | right |
| na960x-clean-06 | programId | CalFresh | right | right |
| na960x-clean-06 | actionType | discontinuance | right | right |
| na960x-clean-06 | formId | NA 960X SAR | right | right |
| na960x-dim-07 | deadlineDate | 2026-09-30 | missed | missed |
| na960x-dim-07 | noticeDate | 2026-09-08 | right | right |
| na960x-dim-07 | effectiveDate | 2026-09-30 | right | right |
| na960x-dim-07 | aidPaidPendingDeadline | 2026-09-18 | right | missed |
| na960x-dim-07 | appealDeadline | 2026-12-07 | right | right |
| na960x-dim-07 | recipientName | MARIA REYES | right | missed |
| na960x-dim-07 | caseNumber | 01-4472-9931 | right | missed |
| na960x-dim-07 | programId | CalFresh | right | right |
| na960x-dim-07 | actionType | discontinuance | right | right |
| na960x-dim-07 | formId | NA 960X SAR | right | right |
| na960y-clean-14 | noticeDate | 2026-09-18 | right | right |
| na960y-clean-14 | effectiveDate | 2026-10-01 | right | right |
| na960y-clean-14 | aidPaidPendingDeadline | 2026-09-28 | right | missed |
| na960y-clean-14 | appealDeadline | 2026-12-17 | right | right |
| na960y-clean-14 | recipientName | ROSA MARTINEZ CRUZ | right | missed |
| na960y-clean-14 | caseNumber | 01-6620-4418 | right | right |
| na960y-clean-14 | programId | CalFresh | right | right |
| na960y-clean-14 | actionType | reduction | right | right |
| na960y-clean-14 | formId | NA 960Y SAR | right | right |
| na960y-shadow-15 | noticeDate | 2026-09-18 | right | right |
| na960y-shadow-15 | effectiveDate | 2026-10-01 | right | right |
| na960y-shadow-15 | aidPaidPendingDeadline | 2026-09-28 | right | missed |
| na960y-shadow-15 | appealDeadline | 2026-12-17 | right | right |
| na960y-shadow-15 | recipientName | ROSA MARTINEZ CRUZ | right | right |
| na960y-shadow-15 | caseNumber | 01-6620-4418 | right | right |
| na960y-shadow-15 | programId | CalFresh | right | right |
| na960y-shadow-15 | actionType | reduction | right | right |
| na960y-shadow-15 | formId | NA 960Y SAR | right | right |
| sar7-angled-03 | deadlineDate | 2026-09-05 | right | missed |
| sar7-angled-03 | recipientName | MARIA REYES | right | missed |
| sar7-angled-03 | caseNumber | 01-4472-9931 | right | missed |
| sar7-angled-03 | programId | CalFresh/CalWORKs | right | missed |
| sar7-angled-03 | actionType | recert_due | right | missed |
| sar7-angled-03 | formId | SAR 7 | right | missed |
| sar7-clean-01 | deadlineDate | 2026-09-05 | right | right |
| sar7-clean-01 | recipientName | MARIA REYES | right | right |
| sar7-clean-01 | caseNumber | 01-4472-9931 | right | right |
| sar7-clean-01 | programId | CalFresh/CalWORKs | right | right |
| sar7-clean-01 | actionType | recert_due | right | right |
| sar7-clean-01 | formId | SAR 7 | right | right |
| sar7-creased-04 | deadlineDate | 2026-09-05 | right | right |
| sar7-creased-04 | recipientName | MARIA REYES | right | right |
| sar7-creased-04 | caseNumber | 01-4472-9931 | right | right |
| sar7-creased-04 | programId | CalFresh/CalWORKs | right | right |
| sar7-creased-04 | actionType | recert_due | right | right |
| sar7-creased-04 | formId | SAR 7 | right | right |
| sar7-dim-02 | deadlineDate | 2026-09-05 | right | right |
| sar7-dim-02 | recipientName | MARIA REYES | right | right |
| sar7-dim-02 | caseNumber | 01-4472-9931 | right | right |
| sar7-dim-02 | programId | CalFresh/CalWORKs | right | right |
| sar7-dim-02 | actionType | recert_due | right | right |
| sar7-dim-02 | formId | SAR 7 | right | right |
| sar7-shadow-05 | deadlineDate | 2026-09-05 | right | right |
| sar7-shadow-05 | recipientName | MARIA REYES | right | right |
| sar7-shadow-05 | caseNumber | 01-4472-9931 | right | right |
| sar7-shadow-05 | programId | CalFresh/CalWORKs | right | right |
| sar7-shadow-05 | actionType | recert_due | right | right |
| sar7-shadow-05 | formId | SAR 7 | right | right |
| sar7es-clean-16 | deadlineDate | 2026-09-05 | right | right |
| sar7es-clean-16 | recipientName | CARMEN DELGADO | right | missed |
| sar7es-clean-16 | caseNumber | 01-5538-7742 | right | right |
| sar7es-clean-16 | programId | CalFresh/CalWORKs | right | right |
| sar7es-clean-16 | actionType | recert_due | right | right |
| sar7es-clean-16 | formId | SAR 7 | right | right |
| sar7es-dim-17 | deadlineDate | 2026-09-05 | right | right |
| sar7es-dim-17 | recipientName | CARMEN DELGADO | right | right |
| sar7es-dim-17 | caseNumber | 01-5538-7742 | right | right |
| sar7es-dim-17 | programId | CalFresh/CalWORKs | right | right |
| sar7es-dim-17 | actionType | recert_due | right | right |
| sar7es-dim-17 | formId | SAR 7 | right | right |
| ssa-clean-19 | deadlineDate | 2026-10-08 | right | right |
| ssa-clean-19 | noticeDate | 2026-09-08 | missed | missed |
| ssa-clean-19 | recipientName | GLORIA HAYES | right | missed |
| ssa-clean-19 | programId | SSI | missed | missed |
| ssa-clean-19 | actionType | recert_due | missed | missed |
| ssa-clean-19 | formId | SSA-8202 | missed | missed |

</details>
