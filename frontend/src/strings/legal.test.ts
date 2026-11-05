import { describe, expect, it } from 'vitest';
import { legalEn } from './en';
import { legalHi } from './legalHi';

describe('privacy policy and terms', () => {
  it('Hindi and English have the same sections and are marked as a draft', () => {
    for (const doc of ['privacy', 'terms'] as const) {
      expect(legalHi[doc].sections).toHaveLength(legalEn[doc].sections.length);
    }
    expect(legalHi.draftNotice).toContain('DRAFT');
    expect(legalEn.draftNotice).toContain('DRAFT – needs legal review');
  });
});
