import type { AuditEntry } from '../../api/pilotAdmin';
import { hiAdmin } from '../../strings/hiAdmin';
import { formatDate } from '../../utils/formatDate';
import { formatRupees } from '../../utils/money';

/** One change in words: what, to whom, by whom, when. Ids stay out of sight. */
export function AuditRow({ entry }: { entry: AuditEntry }) {
  const details = describeDetails(entry);
  return (
    <li className="flex flex-col gap-0.5 p-3 sm:flex-row sm:items-baseline sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-ink-900">
          {hiAdmin.audit.actions[entry.action] ?? entry.action}
          {entry.target.name && <span className="font-normal"> · {entry.target.name}</span>}
        </p>
        {details && <p className="break-words text-sm text-ink-700">{details}</p>}
      </div>
      <p className="shrink-0 text-sm text-ink-500">
        {entry.actorName && `${entry.actorName} · `}
        {formatDate(entry.at)}
      </p>
    </li>
  );
}

function describeDetails({ action, target, details = {} }: AuditEntry): string {
  const { state, ref, reason, amountPaise, resolution } = details;
  const parts: string[] = [];
  if (action === 'flag.set') {
    parts.push(hiAdmin.audit.flagNames[target.id] ?? target.id);
    if (state === 'off' || state === 'pilot' || state === 'all') parts.push(hiAdmin.flags.states[state]);
  }
  if (typeof ref === 'string') parts.push(ref);
  if (typeof amountPaise === 'number') parts.push(formatRupees(amountPaise));
  for (const text of [reason, resolution]) if (typeof text === 'string' && text) parts.push(text);
  return parts.join(' · ');
}
