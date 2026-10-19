import { LuSquare, LuVolume2 } from 'react-icons/lu';
import { useSpeechOutput } from '../../hooks/useSpeech';
import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { IconButton } from './IconButton';

interface SpeakButtonProps {
  text: string;
  /** "icon": round speaker next to headings. "pill": icon + "सुनें" label. */
  variant?: 'icon' | 'pill';
  className?: string;
}

/** Reads `text` aloud in Hindi; tap again to stop. Renders nothing if the browser cannot speak. */
export function SpeakButton({ text, variant = 'icon', className }: SpeakButtonProps) {
  const { supported, speaking, speak, stop } = useSpeechOutput();
  if (!supported) return null;

  const toggle = () => (speaking ? stop() : speak(text));
  const label = speaking ? hi.voice.stop : hi.voice.listen;

  if (variant === 'icon') {
    return (
      <IconButton
        icon={speaking ? LuSquare : LuVolume2}
        label={label}
        tone={speaking ? 'accent' : 'soft'}
        aria-pressed={speaking}
        onClick={toggle}
        className={className}
      />
    );
  }

  return (
    <Button
      variant={speaking ? 'accent' : 'secondary'}
      size="md"
      fullWidth={false}
      icon={speaking ? LuSquare : LuVolume2}
      aria-pressed={speaking}
      onClick={toggle}
      className={cn('rounded-full', className)}
    >
      {label}
    </Button>
  );
}
