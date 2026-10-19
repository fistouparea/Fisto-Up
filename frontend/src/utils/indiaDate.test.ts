import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, todayInIndia } from './indiaDate';

describe('indiaDate', () => {
  it('uses the India calendar day', () => {
    // 20:00 UTC on 19 Oct is already 20 Oct in India.
    expect(todayInIndia(new Date('2026-10-19T20:00:00Z'))).toBe('2026-10-20');
  });

  it('adds and counts days across months', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(daysBetween('2026-10-01', '2026-10-19')).toBe(18);
    expect(daysBetween('2026-10-19', '2026-10-01')).toBe(-18);
  });
});
