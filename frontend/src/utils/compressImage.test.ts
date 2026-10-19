import { describe, expect, it } from 'vitest';
import { fitWithin } from './compressImage';

describe('fitWithin', () => {
  it('scales the longest side down to the limit, keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 });
  });

  it('never enlarges small photos', () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });
});
