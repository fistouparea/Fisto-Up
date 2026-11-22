import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyWarning } from '../components/ui/notify';
import { hi } from '../strings/hi';
import { SpeechPlayer, type SpeechListener } from '../utils/speechPlayer';

const SPEECH_LANG = 'hi-IN';

/** Minimal typing for SpeechRecognition, which TypeScript's DOM types do not include yet. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined' || !window.isSecureContext) return null; // browsers block the mic on http
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function isSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Speech-to-text in Hindi. `supported` is false when the browser cannot do it; hide the mic then. */
export function useSpeechInput(onTranscript: (text: string) => void) {
  const [RecognitionCtor] = useState(getRecognitionConstructor);
  const [listening, setListening] = useState(false);
  const [notHeard, setNotHeard] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const start = useCallback(() => {
    if (!RecognitionCtor) return;
    recognitionRef.current?.abort();

    const recognition = new RecognitionCtor();
    recognition.lang = SPEECH_LANG;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let heard = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim();
      if (transcript) {
        heard = true;
        onTranscript(transcript);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      setListening(false);
      setNotHeard(!heard);
    };

    recognitionRef.current = recognition;
    setNotHeard(false);
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }, [RecognitionCtor, onTranscript]);

  const stop = useCallback(() => recognitionRef.current?.abort(), []);

  return { supported: RecognitionCtor !== null, listening, notHeard, start, stop };
}

let sharedPlayer: SpeechPlayer | null = null;

function getPlayer(): SpeechPlayer | null {
  if (sharedPlayer || !isSynthesisSupported()) return sharedPlayer;
  const player = new SpeechPlayer(window.speechSynthesis, (text) => new SpeechSynthesisUtterance(text), () => navigator.onLine);
  // Chrome keeps talking, or gets stuck, when the page reloads in the middle of speech.
  window.addEventListener('pagehide', () => player.stop());
  sharedPlayer = player;
  return player;
}

/** Reads text aloud in Hindi. `supported` is false when the browser cannot do it; hide the button then. */
export function useSpeechOutput() {
  const [player] = useState(getPlayer);
  const [speaking, setSpeaking] = useState(false);
  const [listener] = useState<SpeechListener>(() => ({
    onEnd: () => setSpeaking(false),
    onProblem: (problem) => notifyWarning(problem === 'noVoice' ? hi.voice.noHindiVoice : hi.voice.speakFailed),
  }));

  // Stop this component's speech when it unmounts (e.g. leaving the result screen).
  useEffect(() => () => player?.stop(listener), [player, listener]);

  const stop = useCallback(() => player?.stop(listener), [player, listener]);

  const speak = useCallback(
    (text: string) => {
      if (player?.speak(text, listener)) setSpeaking(true);
    },
    [player, listener],
  );

  return { supported: player !== null, speaking, speak, stop };
}
