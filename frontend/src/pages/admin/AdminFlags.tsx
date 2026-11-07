import { LuToggleRight } from 'react-icons/lu';
import { fetchAdminFlags, setAdminFlag, type AdminFlag, type FlagState } from '../../api/pilotAdmin';
import { LoadState } from '../../components/admin/LoadState';
import { Chip } from '../../components/ui/Chip';
import { useLoad } from '../../hooks/useLoad';
import { hiAdmin } from '../../strings/hiAdmin';
import { runAdminAction } from './adminAction';

const STATES: FlagState[] = ['off', 'pilot', 'all'];
/** A rule for everyone (e.g. cashPayment): "only pilot" makes no sense. */
const ON_OFF_STATES: FlagState[] = ['off', 'all'];

/** Feature flags: off / only pilot users / everyone. Every change is audited on the server. */
export function AdminFlags() {
  const flags = useLoad(fetchAdminFlags, []);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg text-ink-700">{hiAdmin.flags.intro}</p>
      <LoadState data={flags.data} errorCode={flags.errorCode} reload={flags.reload}>
        {(items) => (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {items.map((flag) => (
              <FlagRow key={flag.key} flag={flag} onChanged={flags.reload} />
            ))}
          </ul>
        )}
      </LoadState>
    </div>
  );
}

function FlagRow({ flag, onChanged }: { flag: AdminFlag; onChanged: () => void }) {
  return (
    <li className="flex flex-col gap-3 rounded-3xl border-2 border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <LuToggleRight aria-hidden="true" className="mt-1 size-6 shrink-0 text-primary-700" />
        <div className="min-w-0">
          <p className="text-lg font-bold text-ink-900">{flag.description}</p>
          <p className="text-sm text-ink-500">
            {flag.key} · {hiAdmin.flags.default}: {hiAdmin.flags.states[flag.default]}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={flag.description}>
        {(flag.onOff ? ON_OFF_STATES : STATES).map((state) => (
          <Chip
            key={state}
            label={hiAdmin.flags.states[state]}
            selected={flag.state === state}
            onClick={() => void runAdminAction(() => setAdminFlag(flag.key, state), hiAdmin.flags.saved, onChanged)}
          />
        ))}
      </div>
      {flag.key === 'cashPayment' && <p className="text-base text-warning-800">{hiAdmin.flags.cashPaymentOffWarning}</p>}
    </li>
  );
}
