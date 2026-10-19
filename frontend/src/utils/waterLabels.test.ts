import { describe, expect, it } from 'vitest';
import { waterStatusLabel } from './waterLabels';

describe('waterStatusLabel', () => {
  it('shows the days for "later" and fixed labels otherwise', () => {
    expect(waterStatusLabel({ crop: 'gehun', status: 'water_later', inDays: 2, reason: '' })).toBe('2 दिन बाद दें');
    expect(waterStatusLabel({ crop: 'gehun', status: 'water_today', reason: '' })).toBe('आज पानी दें');
    expect(waterStatusLabel({ crop: 'gehun', status: 'skip', reason: '' })).toBe('आज पानी न दें');
  });
});
