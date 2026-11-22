import { useState } from 'react';
import { fetchAdminFlags, setAdminFlag, type AdminFlag, type FlagState } from '../../api/pilotAdmin';
import { ConfirmAction } from '../../components/admin/ConfirmAction';
import { LoadState } from '../../components/admin/LoadState';
import { useLoad } from '../../hooks/useLoad';
import { hiAdmin } from '../../strings/hiAdmin';
import { cn } from '../../utils/cn';
import { runAdminAction } from './adminAction';

const STATES: FlagState[] = ['off', 'pilot', 'all'];
/** A rule for everyone (e.g. cashPayment, inviteOnly): "only pilot" makes no sense. */
const ON_OFF_STATES: FlagState[] = ['off', 'all'];

/** Feature flags: off / only pilot users / everyone. Asked once, audited on the server. */
export function AdminFlags() {
  const flags = useLoad(fetchAdminFlags, []);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-ink-700">{hiAdmin.flags.intro}</p>
      <LoadState data={flags.data} errorCode={flags.errorCode} reload={flags.reload}>
        {(items) => (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
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
  const [next, setNext] = useState<FlagState>(flag.state);
  const save = () => runAdminAction(() => setAdminFlag(flag.key, next), hiAdmin.flags.saved, onChanged);

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <p className="min-w-0 flex-1 text-base font-bold text-ink-900">{flag.description}</p>
        <ConfirmAction question={`${flag.description} → ${hiAdmin.flags.states[next]}?`} onConfirm={save}>
          {(ask) => (
            <div className="flex flex-wrap gap-1" role="group" aria-label={flag.description}>
              {(flag.onOff ? ON_OFF_STATES : STATES).map((state) => (
                <button
                  key={state}
                  type="button"
                  aria-pressed={flag.state === state}
                  onClick={() => {
                    if (state === flag.state) return;
                    setNext(state);
                    ask();
                  }}
                  className={cn(
                    'min-h-12 rounded-xl border px-3 text-base font-bold',
                    flag.state === state ? 'border-primary-700 bg-primary-700 text-white' : 'border-line bg-surface text-ink-700 hover:border-primary-300',
                  )}
                >
                  {hiAdmin.flags.states[state]}
                </button>
              ))}
            </div>
          )}
        </ConfirmAction>
      </div>
      {flag.key === 'cashPayment' && <p className="text-sm text-warning-800">{hiAdmin.flags.cashPaymentOffWarning}</p>}
    </li>
  );
}
