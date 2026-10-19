import { useCallback, useEffect, useRef, useState } from 'react';
import { splitIntoSentences } from '../utils/speechText';

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

/** Reads text aloud in Hindi. `supported` is false when the browser cannot do it; hide the button then. */
export function useSpeechOutput() {
  const [supported] = useState(isSynthesisSupported);
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    speakingRef.current = false;
    setSpeaking(false);
  }, [supported]);

  // Stop this component's speech when it unmounts (e.g. leaving the result screen).
  useEffect(() => () => {
    if (speakingRef.current) window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel(); // only one thing speaks at a time

      const voice = findHindiVoice();
      const sentences = splitIntoSentences(text);
      sentences.forEach((sentence, index) => {
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = SPEECH_LANG;
        utterance.rate = 0.9;
        if (voice) utterance.voice = voice;
        if (index === sentences.length - 1) {
          utterance.onend = () => {
            speakingRef.current = false;
            setSpeaking(false);
          };
        }
        utterance.onerror = () => {
          speakingRef.current = false;
          setSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
      });

      speakingRef.current = sentences.length > 0;
      setSpeaking(sentences.length > 0);
    },
    [supported],
  );

  return { supported, speaking, speak, stop };
}

function findHindiVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith('hi'));
}
