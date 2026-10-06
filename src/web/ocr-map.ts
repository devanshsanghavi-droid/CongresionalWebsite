/**
 * Tesseract's output, in the shape Carta's extraction island expects.
 *
 * The iPhone app hands the island one `OcrLine` per recognised line, with a
 * box normalised to 0-1 and a top-left origin (src/carta/lib/ocr/types.ts). The
 * corpus harness hands it exactly the same thing. This file makes Tesseract hand
 * it the same thing too, so `extract()` runs unchanged: the island never learns
 * which recogniser read the page.
 *
 * Pure. Takes Tesseract's page object as a plain argument (structurally typed,
 * so this file does not import tesseract.js and can be tested in Node).
 */

import type { OcrLine, OcrResult } from '../carta/lib/ocr/types.ts';

interface Bbox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

interface TesseractWordLike {
  readonly text: string;
  readonly confidence: number;
  readonly bbox: Bbox;
}

interface TesseractLineLike {
  readonly text: string;
  /** 0-100 in tesseract.js. */
  readonly confidence: number;
  readonly bbox: Bbox;
  readonly words?: readonly TesseractWordLike[];
}

/** The parts of a tesseract.js `Page` this mapping reads. */
export interface TesseractPageLike {
  readonly blocks: readonly {
    readonly paragraphs: readonly {
      readonly lines: readonly TesseractLineLike[];
    }[];
  }[] | null;
}

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * A gap between two words wider than this many word-heights is a column gap,
 * not a space. Ordinary word spacing is well under one word-height.
 */
export const COLUMN_GAP_HEIGHTS = 2.5;

/**
 * Split one Tesseract line where it jumps a column.
 *
 * WHY: Tesseract joins everything on the same printed row into one line, so a
 * notice's address block and its right-hand column come back as
 * `MARIA REYES  Case Number: 01-4472-9931`. Apple Vision, the reader Carta was
 * built and measured with, returns those as two lines with two boxes. Carta's
 * name finder (src/carta/extraction/name.ts) walks the address block as a
 * column and expects its city line to END in ", CA 95122"; on the merged line
 * it never does, so before this split Tesseract found no recipient on any of the
 * four sample photos (measurements/tesseract-vs-vision.md).
 *
 * This changes the recogniser's output, not Carta's code: it makes Tesseract
 * describe the page the way Carta's lines are defined, one run of text, one box.
 * Each part keeps its own words' box and confidence.
 */
export function splitColumns(line: TesseractLineLike): TesseractLineLike[] {
  const words = (line.words ?? []).filter((w) => w.text.trim() !== '');
  if (words.length < 2) return [line];
  const heights = words.map((w) => w.bbox.y1 - w.bbox.y0).sort((a, b) => a - b);
  const wordHeight = heights[Math.floor(heights.length / 2)] ?? 0;
  if (wordHeight <= 0) return [line];

  const groups: TesseractWordLike[][] = [];
  let current: TesseractWordLike[] = [];
  for (const word of [...words].sort((a, b) => a.bbox.x0 - b.bbox.x0)) {
    const previous = current[current.length - 1];
    if (previous !== undefined && word.bbox.x0 - previous.bbox.x1 > COLUMN_GAP_HEIGHTS * wordHeight) {
      groups.push(current);
      current = [];
    }
    current.push(word);
  }
  groups.push(current);
  if (groups.length === 1) return [line];

  return groups.map((group) => ({
    text: group.map((w) => w.text).join(' '),
    confidence: group.reduce((sum, w) => sum + w.confidence, 0) / group.length,
    bbox: {
      x0: Math.min(...group.map((w) => w.bbox.x0)),
      y0: Math.min(...group.map((w) => w.bbox.y0)),
      x1: Math.max(...group.map((w) => w.bbox.x1)),
      y1: Math.max(...group.map((w) => w.bbox.y1)),
    },
  }));
}

/**
 * One `OcrLine` per Tesseract line (or per column of one, see `splitColumns`),
 * in Tesseract's reading order (block, then paragraph, then line). Apple Vision returns its own reading order and the
 * island already copes with reading order that is not document order: that is
 * what its geometry layer is for.
 *
 * `width` and `height` are the pixel size of the image Tesseract was given.
 */
export function pageToOcr(page: TesseractPageLike, width: number, height: number, engine: string): OcrResult {
  const lines: OcrLine[] = [];
  for (const block of page.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const segment of splitColumns(line)) {
          const text = segment.text.replace(/\s+$/u, '').replace(/^\s+/u, '');
          if (text === '') continue;
          const { x0, y0, x1, y1 } = segment.bbox;
          lines.push({
            text,
            confidence: clamp01(segment.confidence / 100),
            box: {
              x: clamp01(x0 / width),
              y: clamp01(y0 / height),
              w: clamp01((x1 - x0) / width),
              h: clamp01((y1 - y0) / height),
            },
          });
        }
      }
    }
  }
  return { lines, text: lines.map((l) => l.text).join('\n'), width, height, engine };
}

/** The recorded Apple Vision files in public/samples, as Carta's harness reads them. */
export interface RecordedVisionOcr {
  readonly engine: string;
  readonly ocrWidth: number;
  readonly ocrHeight: number;
  readonly lines: readonly OcrLine[];
}

export function recordedToOcr(recorded: RecordedVisionOcr): OcrResult {
  return {
    lines: recorded.lines,
    text: recorded.lines.map((l) => l.text).join('\n'),
    width: recorded.ocrWidth,
    height: recorded.ocrHeight,
    engine: recorded.engine,
  };
}
