import { describe, expect, it } from 'vitest';
import { pageToOcr, splitColumns } from '../src/web/ocr-map.ts';

const word = (text: string, x0: number, x1: number, y0 = 600, y1 = 630, confidence = 90) => ({
  text,
  confidence,
  bbox: { x0, y0, x1, y1 },
});

describe('Tesseract to Carta lines', () => {
  it('splits a row that jumps a column, the way Apple Vision returns it', () => {
    const merged = {
      text: 'MARIA REYES Case Number: 01-4472-9931\n',
      confidence: 90,
      bbox: { x0: 246, y0: 598, x1: 1605, y1: 630 },
      words: [
        word('MARIA', 246, 340),
        word('REYES', 351, 448),
        word('Case', 1236, 1301),
        word('Number:', 1312, 1417),
        word('01-4472-9931', 1435, 1605),
      ],
    };
    const parts = splitColumns(merged);
    expect(parts.map((p) => p.text)).toEqual(['MARIA REYES', 'Case Number: 01-4472-9931']);
    expect(parts[1]?.bbox.x0).toBe(1236);
  });

  it('leaves ordinary word spacing alone', () => {
    const plain = {
      text: 'SUBMIT BY: SEPTEMBER 5, 2026',
      confidence: 95,
      bbox: { x0: 265, y0: 866, x1: 886, y1: 900 },
      words: [word('SUBMIT', 265, 414), word('BY:', 427, 488), word('SEPTEMBER', 513, 749), word('5,', 762, 791), word('2026', 805, 886)],
    };
    expect(splitColumns(plain)).toEqual([plain]);
  });

  it('normalises boxes to 0-1 with a top-left origin and confidence to 0-1', () => {
    const ocr = pageToOcr(
      {
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  { text: 'Hello world\n', confidence: 80, bbox: { x0: 200, y0: 100, x1: 600, y1: 150 }, words: [] },
                  { text: '   \n', confidence: 10, bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } },
                ],
              },
            ],
          },
        ],
      },
      2000,
      1000,
      'tesseract.js',
    );
    expect(ocr.lines).toEqual([{ text: 'Hello world', confidence: 0.8, box: { x: 0.1, y: 0.1, w: 0.2, h: 0.05 } }]);
    expect(ocr.text).toBe('Hello world');
    expect(ocr.width).toBe(2000);
  });

  it('copes with a page Tesseract found nothing on', () => {
    expect(pageToOcr({ blocks: null }, 10, 10, 't').lines).toEqual([]);
  });
});
