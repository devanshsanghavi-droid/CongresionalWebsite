/**
 * Reading a photo in the browser, with tesseract.js.
 *
 * Everything it needs is served by this site: the worker script, the
 * WebAssembly engine and the English and Spanish models are under ocr/ (put
 * there by scripts/copy-ocr-assets.mjs). The paths are passed explicitly and
 * absolutely, because tesseract.js otherwise falls back to a public CDN, and
 * because the worker starts from a blob: URL against which a relative path
 * would not resolve. The page's Content-Security-Policy blocks every other
 * origin, and a worker started from a blob: URL inherits that policy, so even a
 * mistake here could not send the photo anywhere.
 *
 * The photo is drawn onto a canvas (which applies the camera's rotation flag,
 * the browser equivalent of the app's "EXIF rotate"), scaled down if it is very
 * large, read, and then dropped. It is never stored.
 */

import { createWorker, OEM } from 'tesseract.js';
import type { OcrResult } from '../carta/lib/ocr/types.ts';
import { pageToOcr } from './ocr-map.ts';
import type { TesseractPageLike } from './ocr-map.ts';

export type LetterLanguage = 'eng' | 'spa' | 'both';

/** Approximate first-time download, for the notice on the Add screen. */
export const FIRST_TIME_MB = 9;

/** Longest side, in pixels. Big enough for small print, small enough for a phone's memory. */
const MAX_SIDE = 2400;

const asset = (path: string): string => new URL(`${import.meta.env.BASE_URL}ocr/${path}`, window.location.href).href;

export interface Progress {
  readonly stage: 'preparing' | 'recognizing';
  readonly fraction: number;
}

async function toCanvas(photo: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(photo);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ocrSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined';
}

export async function recognizePhoto(
  photo: Blob,
  language: LetterLanguage,
  onProgress: (p: Progress) => void,
): Promise<OcrResult> {
  const canvas = await toCanvas(photo);
  const langs = language === 'both' ? ['eng', 'spa'] : [language];
  const worker = await createWorker(langs, OEM.LSTM_ONLY, {
    workerPath: asset('worker.min.js'),
    corePath: asset('core'),
    langPath: asset('lang'),
    // Nothing kept between visits, not even the models: the browser's own HTTP
    // cache already avoids downloading them twice.
    cacheMethod: 'none',
    gzip: true,
    logger: (m) => {
      const recognizing = m.status === 'recognizing text';
      onProgress({ stage: recognizing ? 'recognizing' : 'preparing', fraction: m.progress });
    },
  });
  try {
    const result = await worker.recognize(canvas, {}, { blocks: true, text: true });
    return pageToOcr(result.data as unknown as TesseractPageLike, canvas.width, canvas.height, 'tesseract.js');
  } finally {
    await worker.terminate();
    canvas.width = 0;
    canvas.height = 0;
  }
}
