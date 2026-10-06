/**
 * The web version's reading pipeline: the iPhone app's, minus the camera.
 *
 *   OCR  ->  REDACT  ->  orientation check  ->  extract
 *
 * The same order as the app's src/lib/capture/pipeline.ts, and for the same
 * reason: redaction is the second stage, so the page text that anything else
 * sees has already lost its Social Security numbers. The raw lines go to
 * `extract()` for their geometry, in memory only; they are never stored.
 *
 * Pure: the clock is an argument.
 */

import { extractNotice, redactText } from '../carta/lib/extraction-port/adapter.ts';
import type { ExtractionResult } from '../carta/lib/extraction-port/port.ts';
import { checkOrientation, shouldWarnUpsideDown } from '../carta/lib/ocr/orientation.ts';
import type { OcrResult } from '../carta/lib/ocr/types.ts';

export interface ReadOutcome {
  readonly ocr: OcrResult;
  /** The page text after redaction. The only text that may be kept. */
  readonly redactedText: string;
  readonly containedSsn: boolean;
  readonly upsideDown: boolean;
  readonly extraction: ExtractionResult;
}

export function readLetter(ocr: OcrResult, nowMs: number): ReadOutcome {
  const redaction = redactText(ocr.text);
  const orientation = checkOrientation(ocr.lines);
  const extraction = extractNotice({
    lines: ocr.lines,
    text: redaction.text,
    width: ocr.width,
    height: ocr.height,
    nowMs,
  });
  return {
    ocr,
    redactedText: redaction.text,
    containedSsn: redaction.containedSsn || extraction.containedSsn === true,
    upsideDown: shouldWarnUpsideDown(orientation),
    extraction,
  };
}
