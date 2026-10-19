import { describe, expect, it } from 'vitest';
import type { Diagnosis } from '../api/types';
import { hi } from '../strings/hi';
import { diagnosisToSpeech, splitIntoSentences } from './speechText';

const diagnosis: Diagnosis = {
  problem_name: 'झुलसा रोग',
  explanation: 'ज़्यादा नमी से फफूंद लगी।',
  desi_upay: ['नीम का घोल छिड़कें।'],
  dawai: [{ name: 'मैंकोजेब', kaise_use_karein: 'शाम को छिड़कें।' }],
  savdhani: ['तेज़ हवा में न छिड़कें।'],
};

describe('diagnosisToSpeech', () => {
  it('reads every section in screen order, with the dawai warning and KVK advice', () => {
    const text = diagnosisToSpeech(diagnosis);
    const order = ['झुलसा रोग', 'फफूंद', 'नीम', hi.dawaiWarning, 'मैंकोजेब', 'तेज़ हवा', hi.kvkAdvice];
    const positions = order.map((part) => text.indexOf(part));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('says no medicine is needed and skips empty lists', () => {
    const text = diagnosisToSpeech({ ...diagnosis, desi_upay: [], dawai: [], savdhani: [] });

    expect(text).toContain(hi.noDawaiNeeded);
    expect(text).not.toContain(hi.dawaiWarning);
    expect(text).not.toContain(hi.sections.desiUpay);
  });
});

describe('splitIntoSentences', () => {
  it('splits on Hindi and English sentence ends', () => {
    expect(splitIntoSentences('पहला वाक्य। दूसरा? तीसरा! last one.')).toEqual([
      'पहला वाक्य।',
      'दूसरा?',
      'तीसरा!',
      'last one.',
    ]);
  });

  it('ignores empty text', () => {
    expect(splitIntoSentences('   ')).toEqual([]);
  });
});
