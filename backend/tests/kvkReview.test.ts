import { describe, expect, it } from 'vitest';
import { expertReviewHtml, flatten, ruleRows, ruleRowsCsv } from '../src/eval/expertReview.js';
import { cropForPhoto, REVIEW_HEADER, reviewSheetCsv } from '../src/eval/reviewSheet.js';
import { PROMPT_NAMES, PROMPTS } from '../src/services/ai/promptVersions.js';
import { PACKET_DOSE_NOTE } from '../src/services/dawaiSafety.js';

describe('KVK review sheet', () => {
  it('takes the crop from the label, else the file name, else "other"', () => {
    expect(cropForPhoto('bajra_001.jpg')).toBe('bajra');
    expect(cropForPhoto('IMG_2031.jpg')).toBe('other');
    expect(cropForPhoto('IMG_2031.jpg', 'chana')).toBe('chana');
  });

  it('one row per photo with the AI answer and empty expert columns; unclear and errors are marked', () => {
    const csv = reviewSheetCsv([
      {
        photo: 'bajra_001.jpg',
        crop: 'bajra',
        expected: 'जोगिया',
        response: {
          status: 'ok',
          diagnosis: { problem_name: 'जोगिया रोग', explanation: 'नमी', desi_upay: ['नीम'], dawai: [{ name: 'मेटालैक्सिल', kaise_use_karein: PACKET_DOSE_NOTE }], savdhani: [] },
        },
      },
      { photo: 'blur.jpg', crop: 'other', response: { status: 'unclear' } },
      { photo: 'bad.jpg', crop: 'other', response: { status: 'error', message: 'not an image' } },
    ]);
    const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines[0]?.split(',')).toEqual(REVIEW_HEADER);
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('जोगिया रोग');
    expect(lines[1]).toContain('मेटालैक्सिल');
    expect(lines[1]?.endsWith(',,,,')).toBe(true);
    expect(lines[2]).toContain('unclear');
    expect(lines[3]).toContain('not an image');
  });
});

describe('expert review document', () => {
  it('flattens nested rules; null means no water in that stage', () => {
    expect(flatten({ a: { b: 1, c: null }, d: ['x', 'y'] })).toEqual([['a.b', '1'], ['a.c', 'null (इस चरण में पानी नहीं)'], ['d', 'x | y']]);
  });

  it('covers thresholds, water rules, crop stages, banned and restricted items and generic names', () => {
    const rows = ruleRows();
    const sections = new Set(rows.map((row) => row.section));
    expect(sections.size).toBeGreaterThanOrEqual(10);
    expect(rows.some((row) => row.key === 'heatwave.warningTempMaxC' && row.value === '42')).toBe(true);
    expect(rows.some((row) => row.key === 'chana.flowering' && row.value.startsWith('null'))).toBe(true);
    expect(rows.some((row) => row.key === 'monocrotophos')).toBe(true);
    expect(rows.some((row) => row.key === 'glyphosate')).toBe(true);
    expect(rows.some((row) => row.key === 'mancozeb')).toBe(true);
  });

  it('prints every AI prompt in full, and the CSV has the expert columns', () => {
    const html = expertReviewHtml(ruleRows(), '2026-11-05');
    for (const name of PROMPT_NAMES) expect(html).toContain(PROMPTS[name].version);
    expect(html).not.toContain('<script');
    expect(ruleRowsCsv(ruleRows()).split('\r\n')[0]).toContain('सही मान / सही शब्द');
  });
});
