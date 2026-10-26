import { describe, expect, it } from 'vitest';
import { speechFromParts } from './screenText';

describe('speechFromParts', () => {
  it('joins headings and lines, dropping empty ones', () => {
    expect(speechFromParts(['  मौसम ', '', 'आज  धूप रहेगी'])).toBe('मौसम। आज धूप रहेगी');
  });

  it('cuts long screens at a word end', () => {
    const text = speechFromParts(Array.from({ length: 100 }, () => 'बहुत लंबी बात'));
    expect(text.length).toBeLessThanOrEqual(450);
    expect(text).toMatch(/(बहुत|लंबी|बात)।?$/);
  });
});
