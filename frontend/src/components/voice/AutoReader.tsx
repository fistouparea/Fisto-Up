import { useEffect } from 'react';
import { useFlags } from '../../hooks/useFlags';
import { useSettings } from '../../hooks/useSettings';
import { useSpeechOutput } from '../../hooks/useSpeech';
import { screenText } from '../../utils/screenText';

/** Screens load their data first; then the content is read. */
const READ_DELAY_MS = 1200;

/** "पढ़कर सुनाएँ": when on (सेटिंग), reads each new screen's main content aloud once. */
export function AutoReader({ screenKey }: { screenKey: string }) {
  const { voiceMode } = useFlags();
  const { readAloud } = useSettings();
  const { supported, speak, stop } = useSpeechOutput();
  const on = voiceMode && readAloud && supported;

  useEffect(() => {
    if (!on) return;
    const timer = window.setTimeout(() => {
      const text = screenText(document.querySelector('main'));
      if (text) speak(text);
    }, READ_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [on, screenKey, speak, stop]);

  return null;
}
