import { describe, expect, it } from 'vitest';
import { hi } from '../strings/hi';
import { dayLabel } from './dayLabel';

describe('dayLabel', () => {
  it('says आज and कल, then a weekday', () => {
    expect(dayLabel('2026-11-10', '2026-11-10')).toBe(hi.weather.today);
    expect(dayLabel('2026-11-11', '2026-11-10')).toBe(hi.weather.tomorrow);
    expect(dayLabel('2026-11-12', '2026-11-10')).toBe('गुरु'); // Thursday
  });
});
