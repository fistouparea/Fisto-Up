import { LuWifiOff } from 'react-icons/lu';
import { useConnectivity } from '../hooks/useConnectivity';
import { hi } from '../strings/hi';
import { formatDate } from '../utils/formatDate';
import { SpeakButton } from './ui/SpeakButton';

/** Shown under the top bar whenever the server cannot be reached. */
export function OfflineBanner() {
  const { offline, lastSync } = useConnectivity();
  if (!offline) return null;

  const updated = lastSync ? `${hi.offline.lastUpdate}: ${formatDate(lastSync)}` : hi.offline.never;
  return (
    <div role="status" className="border-b-2 border-warning-400 bg-warning-50">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2">
        <LuWifiOff aria-hidden="true" className="size-7 shrink-0 text-warning-800" />
        <div className="min-w-0 flex-1 leading-snug">
          <p className="text-base font-bold text-ink-900">{hi.offline.banner}</p>
          <p className="text-sm text-warning-800">{updated}</p>
        </div>
        <SpeakButton text={`${hi.offline.banner}। ${updated}`} />
      </div>
    </div>
  );
}
