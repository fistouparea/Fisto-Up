import { useSpeechOutput } from '../hooks/useSpeech';
import { hi } from '../strings/hi';

interface SpeakButtonProps {
  text: string;
  /** Larger button for the main result; small one for chat answers. */
  size?: 'normal' | 'small';
}

/** "सुनें" button that reads `text` aloud. Renders nothing if the browser cannot speak. */
export function SpeakButton({ text, size = 'normal' }: SpeakButtonProps) {
  const { supported, speaking, speak, stop } = useSpeechOutput();
  if (!supported) return null;

  const sizeClasses = size === 'normal' ? 'min-h-14 px-5 text-xl' : 'min-h-11 px-3 text-base';
  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(text))}
      aria-pressed={speaking}
      className={`inline-flex items-center gap-2 self-start rounded-full border-2 border-green-700 bg-white font-bold text-green-800 active:bg-green-50 ${sizeClasses}`}
    >
      <span aria-hidden="true">{speaking ? '⏹️' : '🔊'}</span>
      {speaking ? hi.voice.stop : hi.voice.listen}
    </button>
  );
}
