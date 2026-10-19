import { useSpeechInput } from '../hooks/useSpeech';
import { hi } from '../strings/hi';

interface MicButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

/** Hold-free mic button: tap, speak in Hindi, the text arrives via `onTranscript`. Hidden if unsupported. */
export function MicButton({ onTranscript, disabled = false }: MicButtonProps) {
  const { supported, listening, notHeard, start, stop } = useSpeechInput(onTranscript);
  if (!supported) return null;

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        disabled={disabled}
        onClick={listening ? stop : start}
        aria-label={listening ? hi.voice.listening : hi.voice.speak}
        aria-pressed={listening}
        className={`min-h-14 min-w-14 rounded-xl text-2xl text-white disabled:bg-gray-400 ${
          listening ? 'animate-pulse bg-red-600' : 'bg-green-700'
        }`}
      >
        <span aria-hidden="true">🎤</span>
      </button>
      {listening && <span className="mt-1 text-sm text-red-700">{hi.voice.listening}</span>}
      {notHeard && !listening && <span className="mt-1 text-sm text-gray-600">{hi.voice.notHeard}</span>}
    </div>
  );
}
