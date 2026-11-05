import { describe, expect, it } from 'vitest';
import { enApp } from './enApp';
import { hiStrings } from './hi';
import { hiFeatureStrings } from './hiFeatures';
import { rajApp } from './raj';

/** Every key path in a translation must exist in Hindi (the source), with the same kind of value. */
function strayKeys(translation: unknown, source: unknown, path = ''): string[] {
  if (typeof translation === 'string') return typeof source === 'string' ? [] : [path];
  if (Array.isArray(translation)) return Array.isArray(source) && source.length === translation.length ? [] : [path];
  if (typeof translation !== 'object' || translation === null) return [path];
  if (typeof source !== 'object' || source === null) return [path];
  return Object.entries(translation).flatMap(([key, value]) => strayKeys(value, (source as Record<string, unknown>)[key], `${path}.${key}`));
}

describe('translation files stay in sync with Hindi', () => {
  it('English and Rajasthani only use keys that exist in Hindi', () => {
    const hindi = { ...hiStrings, ...hiFeatureStrings };
    expect(strayKeys(enApp, hindi)).toEqual([]);
    expect(strayKeys(rajApp, hindi)).toEqual([]);
  });

  it('the Phase 5/6 farmer screens have English titles', () => {
    expect(enApp.schemes?.title).toBeTruthy();
    expect(enApp.services?.kinds?.equipment?.title).toBeTruthy();
    expect(enApp.mandiTrips?.title).toBeTruthy();
    expect(enApp.delivery?.title).toBeTruthy();
    expect(enApp.complaints?.title).toBeTruthy();
  });
});
