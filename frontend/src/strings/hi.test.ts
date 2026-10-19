import { describe, expect, it } from 'vitest';
import { errorMessages, hi } from './hi';

describe('Hindi messages required by the spec', () => {
  it('uses the exact unclear-photo, busy and KVK texts', () => {
    expect(hi.unclearPhoto).toBe('फोटो साफ नहीं है, कृपया पास से और रोशनी में दोबारा फोटो लें।');
    expect(errorMessages.RATE_LIMITED).toBe('अभी बहुत लोग जाँच करवा रहे हैं, थोड़ी देर बाद कोशिश करें।');
    expect(hi.kvkAdvice).toBe('पक्का करने के लिए अपने नज़दीकी कृषि विज्ञान केंद्र (KVK) से सलाह लें।');
    expect(hi.checking).toBe('जाँच हो रही है...');
    expect(hi.dawaiWarning).toBe('दवाई डालने से पहले पैकेट पढ़ें और दस्ताने-मास्क पहनें।');
  });
});
