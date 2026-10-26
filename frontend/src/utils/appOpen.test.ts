import { describe, expect, it } from 'vitest';
import { memoryStorage } from '../test/memoryStorage';
import { shouldReportAppOpen } from './appOpen';

describe('shouldReportAppOpen', () => {
  it('reports once per day', () => {
    const storage = memoryStorage();
    expect(shouldReportAppOpen(storage, '2026-11-10')).toBe(true);
    expect(shouldReportAppOpen(storage, '2026-11-10')).toBe(false);
    expect(shouldReportAppOpen(storage, '2026-11-11')).toBe(true);
  });
});
