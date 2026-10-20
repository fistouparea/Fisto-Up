import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from './push';

describe('urlBase64ToUint8Array', () => {
  it('decodes URL-safe base64 without padding', () => {
    // "+/8=" in normal base64 is bytes [251, 255]; URL-safe without padding is "-_8"
    expect([...urlBase64ToUint8Array('-_8')]).toEqual([251, 255]);
    expect([...urlBase64ToUint8Array('AQID')]).toEqual([1, 2, 3]);
  });
});
