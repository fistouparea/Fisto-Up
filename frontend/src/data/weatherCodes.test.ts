import { describe, expect, it } from 'vitest';
import { hi } from '../strings/hi';
import { weatherVisual } from './weatherCodes';

describe('weatherVisual', () => {
  it.each([
    [0, hi.weather.codes.clear],
    [2, hi.weather.codes.partlyCloudy],
    [3, hi.weather.codes.cloudy],
    [45, hi.weather.codes.fog],
    [53, hi.weather.codes.drizzle],
    [61, hi.weather.codes.rain],
    [65, hi.weather.codes.heavyRain],
    [95, hi.weather.codes.storm],
    [999, hi.weather.codes.cloudy],
  ])('maps WMO code %i to "%s"', (code, label) => {
    expect(weatherVisual(code).label).toBe(label);
  });
});
