/**
 * The bundled sample letters: four fictional notices from Carta's evaluation
 * corpus, printed and photographed for testing (the app's tools/corpus). Copied
 * here by scripts/sync-from-carta.mjs, with the Apple Vision OCR that the
 * corpus recorded from each photo.
 *
 * No real person's letter is used anywhere; the corpus was generated precisely
 * because real notices carry other people's Social Security numbers.
 */

import type { OcrResult } from '../carta/lib/ocr/types.ts';
import { recordedToOcr } from './ocr-map.ts';
import type { RecordedVisionOcr } from './ocr-map.ts';

export interface Sample {
  readonly id: string;
  /** i18n key for its name. */
  readonly nameKey: string;
}

export const SAMPLES: readonly Sample[] = [
  { id: 'sar7-clean-01', nameKey: 'web.sample.sar7' },
  { id: 'na960x-clean-06', nameKey: 'web.sample.na960x' },
  { id: 'cf3776-clean-10', nameKey: 'web.sample.cf3776' },
  { id: 'mc210-clean-12', nameKey: 'web.sample.mc210' },
];

export const samplePhotoUrl = (id: string): string => `${import.meta.env.BASE_URL}samples/${id}.jpg`;

export async function loadSampleOcr(id: string): Promise<OcrResult> {
  const response = await fetch(`${import.meta.env.BASE_URL}samples/${id}.jpg.json`);
  if (!response.ok) throw new Error(`sample ${id}: ${response.status}`);
  return recordedToOcr((await response.json()) as RecordedVisionOcr);
}

export async function loadSamplePhoto(id: string): Promise<Blob> {
  const response = await fetch(samplePhotoUrl(id));
  if (!response.ok) throw new Error(`sample photo ${id}: ${response.status}`);
  return response.blob();
}
