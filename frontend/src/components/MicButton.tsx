import { useEffect } from 'react';
import { LuMic, LuSquare } from 'react-icons/lu';
import { useSpeechInput } from '../hooks/useSpeech';
import { hi } from '../strings/hi';
import { cn } from '../utils/cn';
import { IconButton } from './ui/IconButton';
import { notifyWarning } from './ui/notify';

interface MicButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

/** Big round mic: tap, speak Hindi, the text arrives via `onTranscript`. Renders nothing if unsupported. */
export function MicButton({ onTranscript, disabled = false }: MicButtonProps) {
  const { supported, listening, notHeard, start, stop } = useSpeechInput(onTranscript);

  useEffect(() => {
    if (notHeard) notifyWarning(hi.voice.notHeard);
  }, [notHeard]);

  if (!supported) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="relative">
        {listening && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-danger-400/50" />}
        <IconButton
          icon={listening ? LuSquare : LuMic}
          label={listening ? hi.voice.listening : hi.voice.speak}
          tone={listening ? 'danger' : 'primary'}
          size="lg"
          disabled={disabled}
          aria-pressed={listening}
          onClick={listening ? stop : start}
          className="relative shadow-raised"
        />
      </span>
      <span className={cn('text-lg', listening ? 'font-bold text-danger-700' : 'text-ink-500')}>
        {listening ? hi.voice.listening : hi.chat.micHint}
      </span>
    </div>
  );
}
