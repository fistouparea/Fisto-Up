import { useFlags } from '../hooks/useFlags';
import { MicButton } from './MicButton';

interface VoiceTextBoxProps {
  id: string;
  label: string;
  value: string;
  onChange: (text: string) => void;
  maxLength: number;
  placeholder?: string;
}

/** Speak (🎤, turned into text on the phone; no audio is sent) or type. The mic hides when unsupported or flagged off. */
export function VoiceTextBox({ id, label, value, onChange, maxLength, placeholder }: VoiceTextBoxProps) {
  const { voiceInput } = useFlags();
  return (
    <div className="flex flex-col gap-3">
      {voiceInput && <MicButton onTranscript={(heard) => onChange((value ? `${value} ${heard}` : heard).slice(0, maxLength))} />}
      <label htmlFor={id} className="text-lg font-bold text-ink-900">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        rows={3}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border-2 border-line bg-surface p-4 text-xl text-ink-900 focus:border-primary-700 focus:outline-none"
      />
    </div>
  );
}
