import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pickVoice, SPEECH_TIMING, SpeechPlayer, type SpeechListener } from './speechPlayer';
import { MAX_CHUNK_LENGTH, toSpeechChunks } from './speechText';

const voice = (lang: string, localService = true) => ({ lang, localService, name: lang }) as SpeechSynthesisVoice;

/** A speech engine that speaks only when the test says so, and drops speak() right after cancel(), like Chrome. */
class FakeSynth {
  speaking = false;
  pending = false;
  paused = false;
  spoken: SpeechSynthesisUtterance[] = [];
  dropped = 0;
  private cancelledAt = -1;

  constructor(public voices: SpeechSynthesisVoice[] = [voice('hi-IN')]) {}

  getVoices = () => this.voices;
  resume = () => {
    this.paused = false;
  };
  cancel = () => {
    this.speaking = false;
    this.cancelledAt = Date.now();
  };
  speak = (utterance: SpeechSynthesisUtterance) => {
    if (Date.now() === this.cancelledAt) this.dropped += 1;
    else this.spoken.push(utterance);
  };

  get last() {
    const last = this.spoken.at(-1);
    if (!last) throw new Error('nothing was spoken');
    return last;
  }
  start() {
    this.speaking = true;
    this.last.onstart?.call(this.last, {} as SpeechSynthesisEvent);
  }
  finish() {
    this.speaking = false;
    this.last.onend?.call(this.last, {} as SpeechSynthesisEvent);
  }
  fail(error: string) {
    this.speaking = false;
    this.last.onerror?.call(this.last, { error } as SpeechSynthesisErrorEvent);
  }
}

function setup(voices?: SpeechSynthesisVoice[]) {
  const synth = new FakeSynth(voices);
  const player = new SpeechPlayer(synth as unknown as SpeechSynthesis, (text) => ({ text }) as SpeechSynthesisUtterance, () => true);
  const listener = () => ({ onEnd: vi.fn(), onProblem: vi.fn() }) satisfies SpeechListener;
  return { synth, player, listener };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('SpeechPlayer', () => {
  it('speaks at once from a quiet engine (iOS allows it only inside the tap)', () => {
    const { synth, player, listener } = setup();
    player.speak('नमस्ते', listener());
    expect(synth.spoken.map((item) => item.text)).toEqual(['नमस्ते']);
  });

  it('a second speaker button is not swallowed, and the first one turns off', () => {
    const { synth, player, listener } = setup();
    const first = listener();
    player.speak('पहला', first);
    synth.start();
    player.speak('दूसरा', listener());
    vi.advanceTimersByTime(SPEECH_TIMING.restartMs);
    expect(first.onEnd).toHaveBeenCalledOnce();
    expect(synth.dropped).toBe(0);
    expect(synth.last.text).toBe('दूसरा');
  });

  it("a closing screen does not silence another screen's speech", () => {
    const { synth, player, listener } = setup();
    const playing = listener();
    player.speak('चल रहा है', playing);
    synth.start();
    player.stop(listener());
    expect(synth.speaking).toBe(true);
    expect(playing.onEnd).not.toHaveBeenCalled();
  });

  it('reads every sentence in order, then ends', () => {
    const { synth, player, listener } = setup();
    const me = listener();
    player.speak('पहला। दूसरा।', me);
    synth.start();
    synth.finish();
    synth.start();
    synth.finish();
    expect(synth.spoken.map((item) => item.text)).toEqual(['पहला।', 'दूसरा।']);
    expect(me.onEnd).toHaveBeenCalledOnce();
  });

  it('goes on when the engine loses the end event', () => {
    const { synth, player, listener } = setup();
    player.speak('पहला। दूसरा।', listener());
    synth.start();
    synth.speaking = false;
    vi.advanceTimersByTime(SPEECH_TIMING.checkMs * 2);
    expect(synth.last.text).toBe('दूसरा।');
  });

  it('resumes a paused engine', () => {
    const { synth, player, listener } = setup();
    player.speak('नमस्ते', listener());
    synth.start();
    synth.paused = true;
    vi.advanceTimersByTime(SPEECH_TIMING.checkMs);
    expect(synth.paused).toBe(false);
  });

  it('tries the default voice when the chosen one fails, then says so', () => {
    const { synth, player, listener } = setup();
    const me = listener();
    player.speak('नमस्ते', me);
    synth.fail('network');
    vi.advanceTimersByTime(SPEECH_TIMING.restartMs);
    expect(synth.spoken).toHaveLength(2);
    expect(synth.last.voice).toBeUndefined();
    synth.fail('synthesis-failed');
    expect(me.onProblem).toHaveBeenCalledWith('failed');
    expect(me.onEnd).toHaveBeenCalledOnce();
  });

  it('retries speech that never starts', () => {
    const { synth, player, listener } = setup();
    player.speak('नमस्ते', listener());
    vi.advanceTimersByTime(SPEECH_TIMING.startTimeoutMs + SPEECH_TIMING.restartMs);
    expect(synth.spoken).toHaveLength(2);
  });

  it('says when the phone has no Hindi voice, but not while the list is still loading', () => {
    const missing = setup([voice('en-US')]);
    const a = missing.listener();
    missing.player.speak('नमस्ते', a);
    expect(a.onProblem).toHaveBeenCalledWith('noVoice');

    const loading = setup([]);
    const b = loading.listener();
    loading.player.speak('नमस्ते', b);
    expect(b.onProblem).not.toHaveBeenCalled();
    expect(loading.synth.last.lang).toBe('hi-IN');
  });

  it('stays quiet about auto read before the first tap', () => {
    const { synth, player, listener } = setup();
    const me = listener();
    player.speak('नमस्ते', me);
    synth.fail('not-allowed');
    expect(me.onProblem).not.toHaveBeenCalled();
    expect(me.onEnd).toHaveBeenCalledOnce();
  });

  it('English text gets an English voice', () => {
    const { synth, player, listener } = setup([voice('hi-IN'), voice('en-IN')]);
    player.speak('Payment: cash on delivery', listener());
    expect(synth.last.lang).toBe('en-IN');
  });
});

describe('pickVoice', () => {
  it('knows Android spelling, prefers on-phone voices offline, and falls back to Devanagari voices', () => {
    expect(pickVoice([voice('en-US'), voice('hi_IN')], 'hi-IN', true)?.lang).toBe('hi_IN');
    expect(pickVoice([voice('hi-IN', false), voice('hi-IN', true)], 'hi-IN', false)?.localService).toBe(true);
    expect(pickVoice([voice('mr-IN')], 'hi-IN', true)?.lang).toBe('mr-IN');
  });
});

describe('toSpeechChunks', () => {
  it('cuts long sentences without losing a word', () => {
    const text = Array.from({ length: 90 }, (_, index) => `शब्द${index}`).join(' ');
    const chunks = toSpeechChunks(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_LENGTH);
    expect(chunks.join(' ')).toBe(text);
  });

  it('says amounts and skips emoji and links', () => {
    expect(toSpeechChunks('भाव ₹2,500 👍')).toEqual(['भाव 2500 रुपये']);
    expect(toSpeechChunks('👍 https://example.com')).toEqual([]);
  });
});
