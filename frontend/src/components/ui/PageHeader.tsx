import type { IconType } from 'react-icons';
import { LuArrowLeft } from 'react-icons/lu';
import { IconButton } from './IconButton';
import { SpeakButton } from './SpeakButton';

interface PageHeaderProps {
  title: string;
  icon?: IconType;
  /** Spoken by the speaker button; defaults to the title. */
  speakText?: string;
  onBack?: () => void;
  backLabel?: string;
}

export function PageHeader({ title, icon: Icon, speakText, onBack, backLabel }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {onBack && backLabel && <IconButton icon={LuArrowLeft} label={backLabel} onClick={onBack} />}
      {Icon && <Icon aria-hidden="true" className="size-8 shrink-0 text-primary-700" />}
      <h2 className="min-w-0 flex-1 text-2xl font-bold leading-tight text-ink-900">{title}</h2>
      <SpeakButton text={speakText ?? title} />
    </div>
  );
}
