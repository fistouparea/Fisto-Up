import { SpeakButton } from './SpeakButton';

interface LoaderProps {
  title: string;
  hint?: string;
}

/** Friendly "checking" animation: a swaying leaf with a magnifier scanning it. CSS-only, cheap on old phones. */
export function Loader({ title, hint }: LoaderProps) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-4 text-center">
      <LeafScanIllustration />
      <div className="flex items-center gap-3">
        <p className="text-2xl font-bold text-primary-700">{title}</p>
        <SpeakButton text={hint ? `${title} ${hint}` : title} />
      </div>
      {hint && <p className="text-lg text-ink-500">{hint}</p>}
    </div>
  );
}

function LeafScanIllustration() {
  return (
    <svg viewBox="0 0 160 160" className="size-32" aria-hidden="true">
      <circle cx="80" cy="80" r="76" className="fill-surface-green" />
      <g className="origin-[80px_130px] animate-sway">
        <path d="M80 132 C 80 110, 80 90, 80 60" className="stroke-primary-700" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M80 100 C 50 100, 38 76, 42 52 C 66 52, 82 70, 80 100 Z" className="fill-primary-500" />
        <path d="M80 84 C 108 84, 122 62, 118 36 C 92 36, 78 56, 80 84 Z" className="fill-primary-400" />
        <path d="M80 100 L 56 66 M80 84 L 104 50" className="stroke-primary-50" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g className="animate-scan">
        <circle cx="96" cy="74" r="20" className="fill-surface/40 stroke-accent-500" strokeWidth="7" />
        <path d="M110 88 L 128 106" className="stroke-ink-900" strokeWidth="9" strokeLinecap="round" />
      </g>
    </svg>
  );
}
