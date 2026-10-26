import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorage } from '../test/memoryStorage';
import { getSettings, reloadSettings, subscribeSettings, updateSettings } from './settings';

describe('app settings', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true });
    reloadSettings();
  });

  it('starts with read aloud and Rajasthani answers off', () => {
    expect(getSettings()).toEqual({ readAloud: false, rajasthaniAnswers: false });
  });

  it('saves a change, tells listeners and keeps it after a reload', () => {
    let calls = 0;
    const unsubscribe = subscribeSettings(() => (calls += 1));
    updateSettings({ readAloud: true });
    unsubscribe();
    expect(calls).toBe(1);
    reloadSettings();
    expect(getSettings().readAloud).toBe(true);
  });

  it('ignores broken stored values', () => {
    localStorage.setItem('agriai.settings', '{"readAloud":"yes"');
    reloadSettings();
    expect(getSettings().readAloud).toBe(false);
  });
});
