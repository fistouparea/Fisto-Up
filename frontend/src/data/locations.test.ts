import { describe, expect, it } from 'vitest';
import { DISTRICTS, nearestTehsil } from './locations';

describe('locations', () => {
  it('lists Churu tehsils with coordinates inside Rajasthan', () => {
    const churu = DISTRICTS.find((district) => district.name === 'चूरू');
    expect(churu?.tehsils.length).toBeGreaterThanOrEqual(7);
    for (const tehsil of churu?.tehsils ?? []) {
      expect(tehsil.lat).toBeGreaterThan(27);
      expect(tehsil.lat).toBeLessThan(29.5);
      expect(tehsil.lon).toBeGreaterThan(73.5);
      expect(tehsil.lon).toBeLessThan(76);
    }
  });

  it('finds the nearest tehsil for a GPS point nearby, and nothing far away', () => {
    expect(nearestTehsil(28.45, 74.5)?.tehsil.name).toBe('सरदारशहर');
    expect(nearestTehsil(26.9, 75.8)).toBeNull(); // Jaipur
  });
});
