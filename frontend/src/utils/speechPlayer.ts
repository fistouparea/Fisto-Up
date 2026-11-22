import { toSpeechChunks } from './speechText';

/*
 * The one speaker of the app (the phone has one voice). Works around browser speech engines:
 *   - Chrome drops speak() right after cancel(): a short pause in between, only when something was playing
 *     (otherwise speak at once, iOS allows it only inside the tap);
 *   - long sentences stop after ~15 s: short pieces, one after another;
 *   - the end event gets lost (or the utterance is garbage collected): keep it, and watch the engine;
 *   - a voice that never starts or fails (online voice without internet): try again with the phone's default;
 *   - an engine left paused (screen was off): resume it.
 */

export const SPEECH_TIMING = { restartMs: 120, checkMs: 500, startTimeoutMs: 5_000 } as const;

/** noVoice: the phone has no Hindi voice. failed: it could not speak. */
export type SpeechProblem = 'noVoice' | 'failed';

export interface SpeechListener {
  onEnd(): void;
  onProblem(problem: SpeechProblem): void;
}

/** Errors that are not the phone's fault: we stopped it, or speech before the first tap (auto read). */
const QUIET_ERRORS: ReadonlySet<string> = new Set(['canceled', 'interrupted', 'not-allowed']);

interface Job {
  listener: SpeechListener;
  chunks: string[];
  index: number;
  /** Second try of this piece, with the phone's default voice. */
  retried: boolean;
  startedAt: number;
  started: boolean;
  quietChecks: number;
  utterance: SpeechSynthesisUtterance | null;
  warned: boolean;
}

export class SpeechPlayer {
  private job: Job | null = null;
  private watch: ReturnType<typeof setInterval> | undefined;
  private restart: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly synth: SpeechSynthesis,
    private readonly createUtterance: (text: string) => SpeechSynthesisUtterance,
    private readonly isOnline: () => boolean,
  ) {
    this.synth.getVoices(); // starts loading the voice list, so it is there at the first tap
  }

  /** Stops whatever speaks and reads `text`. False: there was nothing to read. */
  speak(text: string, listener: SpeechListener): boolean {
    const wasBusy = this.synth.speaking || this.synth.pending;
    this.end();
    if (wasBusy) this.synth.cancel();
    const chunks = toSpeechChunks(text);
    if (chunks.length === 0) return false;

    this.job = { listener, chunks, index: 0, retried: false, startedAt: Date.now(), started: false, quietChecks: 0, utterance: null, warned: false };
    const job = this.job;
    if (wasBusy) this.restart = setTimeout(() => this.play(job), SPEECH_TIMING.restartMs);
    else this.play(job);
    return true;
  }

  /** Stops the speech of `listener` only: a closing screen must not silence another one's. No listener: all. */
  stop(listener?: SpeechListener): void {
    if (listener && this.job?.listener !== listener) return;
    this.end();
    this.synth.cancel();
  }

  private end(): void {
    clearTimeout(this.restart);
    clearInterval(this.watch);
    const job = this.job;
    this.job = null;
    job?.listener.onEnd();
  }

  private play(job: Job): void {
    const text = job.chunks[job.index];
    if (this.job !== job) return;
    if (text === undefined) {
      this.end();
      return;
    }

    const lang = /[a-z]/i.test(text) && !/[ऀ-ॿ]/.test(text) ? 'en-IN' : 'hi-IN';
    const utterance = this.createUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    const voices = this.synth.getVoices();
    const voice = pickVoice(voices, lang, this.isOnline());
    if (voice && !job.retried) {
      utterance.voice = voice;
      utterance.lang = voice.lang.replace('_', '-');
    }
    // An English voice reads Hindi as silence, so say why instead of only staying quiet.
    if (!voice && voices.length > 0 && lang === 'hi-IN' && !job.warned) {
      job.warned = true;
      job.listener.onProblem('noVoice');
    }

    const mine = () => this.job === job && job.utterance === utterance;
    utterance.onstart = () => {
      if (mine()) job.started = true;
    };
    utterance.onend = () => {
      if (mine()) this.next(job);
    };
    utterance.onerror = (event) => {
      if (!mine()) return;
      if (QUIET_ERRORS.has(event.error)) this.end();
      else this.retry(job);
    };

    job.utterance = utterance;
    job.started = false;
    job.startedAt = Date.now();
    job.quietChecks = 0;
    this.synth.resume();
    this.synth.speak(utterance);
    clearInterval(this.watch);
    this.watch = setInterval(() => this.check(job), SPEECH_TIMING.checkMs);
  }

  private next(job: Job): void {
    job.index += 1;
    job.retried = false;
    this.play(job);
  }

  private retry(job: Job): void {
    clearInterval(this.watch);
    if (job.retried) {
      if (!job.warned) job.listener.onProblem('failed');
      this.end();
      this.synth.cancel();
      return;
    }
    job.retried = true;
    job.utterance = null; // its late events no longer count
    this.synth.cancel();
    this.restart = setTimeout(() => this.play(job), SPEECH_TIMING.restartMs);
  }

  private check(job: Job): void {
    if (this.job !== job) return;
    if (this.synth.paused) this.synth.resume();
    if (!job.started) {
      if (Date.now() - job.startedAt >= SPEECH_TIMING.startTimeoutMs) this.retry(job);
      return;
    }
    job.quietChecks = this.synth.speaking || this.synth.pending ? 0 : job.quietChecks + 1;
    if (job.quietChecks >= 2) this.next(job); // the end event was lost
  }
}

/**
 * The best installed voice for `lang`: exact region first; offline only then prefers on-phone voices. Marathi and
 * Nepali voices read the same script, better than no Hindi at all.
 */
export function pickVoice(voices: readonly SpeechSynthesisVoice[], lang: 'hi-IN' | 'en-IN', online: boolean): SpeechSynthesisVoice | undefined {
  const normal = (voice: SpeechSynthesisVoice) => voice.lang.replace('_', '-').toLowerCase();
  const prefixes = lang === 'hi-IN' ? ['hi-in', 'hi', 'mr', 'ne'] : ['en-in', 'en'];
  const ranked = online ? [...voices] : [...voices].sort((a, b) => Number(b.localService) - Number(a.localService));
  for (const prefix of prefixes) {
    const found = ranked.find((voice) => normal(voice).startsWith(prefix));
    if (found) return found;
  }
  return undefined;
}
