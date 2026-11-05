import { describe, expect, it } from 'vitest';
import { errorMessages, hi } from '../strings/hi';
import { activateLanguage } from './lang';

describe('react-i18next languages', () => {
  it('Hindi by default, English and Rajasthani on change, Hindi where a text is missing', async () => {
    expect(hi.nav.home).toBe('होम');
    await activateLanguage('en');
    expect(hi.nav.home).toBe('Home');
    expect(hi.market.title).toBe('Marketplace');
    expect(errorMessages.NETWORK).toMatch(/internet/i);
    await activateLanguage('raj');
    expect(hi.nav.home).toBe('घर');
    // Not translated in Rajasthani: the Hindi text.
    expect(hi.dawaiWarning).toBe('दवाई डालने से पहले पैकेट पढ़ें और दस्ताने-मास्क पहनें।');
    await activateLanguage('hi');
    expect(hi.nav.home).toBe('होम');
  });
});
