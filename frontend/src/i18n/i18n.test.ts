import { describe, expect, it } from 'vitest';
import { hi, errorMessages } from '../strings/hi';
import { i18next } from './i18n';

describe('react-i18next languages', () => {
  it('Hindi by default, English and Rajasthani on change, Hindi where a text is missing', async () => {
    expect(hi.nav.home).toBe('होम');
    await i18next.changeLanguage('en');
    expect(hi.nav.home).toBe('Home');
    expect(errorMessages.NETWORK).toMatch(/internet/i);
    await i18next.changeLanguage('raj');
    expect(hi.nav.home).toBe('घर');
    // Not translated in Rajasthani: the Hindi text.
    expect(hi.dawaiWarning).toBe('दवाई डालने से पहले पैकेट पढ़ें और दस्ताने-मास्क पहनें।');
    await i18next.changeLanguage('hi');
    expect(hi.nav.home).toBe('होम');
  });
});
