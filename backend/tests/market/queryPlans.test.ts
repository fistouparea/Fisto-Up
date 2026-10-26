import { describe, expect, it } from 'vitest';
import { checkQueryPlans } from '../../src/db/queryPlans.js';
import { useTestDatabase } from '../setup/testDatabase.js';

useTestDatabase();

describe('database indexes', () => {
  it('every frequent query uses an index (no full collection scan)', async () => {
    const results = await checkQueryPlans();
    expect(results.filter((result) => result.fullScan)).toEqual([]);
    expect(results.every((result) => result.plan.includes('IXSCAN') || result.plan.includes('IDHACK'))).toBe(true);
  });
});
