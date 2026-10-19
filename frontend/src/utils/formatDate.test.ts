import { describe, expect, it } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats in Hindi and Indian time', () => {
    const text = formatDate('2026-10-19T10:30:00Z'); // 4:00 pm IST
    expect(text).toContain('अक्टूबर');
    expect(text).toContain('2026');
    expect(text).toMatch(/4:00/);
  });

  it('returns empty text for an invalid date', () => {
    expect(formatDate('not a date')).toBe('');
  });
});
