import { useState, type FormEvent } from 'react';
import { LuBan, LuCopy, LuPlus, LuShare2, LuTicket } from 'react-icons/lu';
import { createInvite, fetchAdminFlags, fetchInvites, revokeInvite, setAdminFlag, type Invite } from '../../api/pilotAdmin';
import { ConfirmAction } from '../../components/admin/ConfirmAction';
import { LoadState } from '../../components/admin/LoadState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { TextField } from '../../components/ui/TextField';
import { notifySuccess, notifyWarning } from '../../components/ui/notify';
import { useLoad } from '../../hooks/useLoad';
import { roleLabels } from '../../strings/hi';
import { hiAdmin } from '../../strings/hiAdmin';
import { formatDate } from '../../utils/formatDate';
import { inviteStatus, type InviteStatus } from '../../utils/inviteStatus';
import { whatsappShareUrl } from '../../utils/share';
import { runAdminAction } from './adminAction';

type RoleChoice = 'any' | 'seller' | 'buyer';
/** The server's INVITE_RULES. */
const MAX_USES = 200;
const MAX_DAYS = 180;
const DAY_CHOICES = ['7', '30', '90', ''] as const;
const STATUSES: InviteStatus[] = ['active', 'usedUp', 'expired', 'revoked'];
const STATUS_TONE = { active: 'success', usedUp: 'neutral', expired: 'warning', revoked: 'danger' } as const;
const PANEL = 'rounded-2xl border border-line bg-surface p-4';

/** Invite (activation) codes: is a code needed at all, make one, share it, see who used how many, stop one. */
export function AdminInvites() {
  const invites = useLoad(fetchInvites, []);
  const [created, setCreated] = useState<Invite | null>(null);
  const [status, setStatus] = useState<InviteStatus>('active');
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-5">
      <InviteOnlySwitch />
      <div className="grid items-start gap-5 lg:grid-cols-5">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <CreateCode
            onCreated={(invite) => {
              setCreated(invite);
              setStatus('active');
              invites.reload();
            }}
          />
          {created && (
            <section role="status" className="flex flex-col gap-3 rounded-2xl border-2 border-success-600 bg-success-50 p-4">
              <p className="text-base font-bold text-success-800">{hiAdmin.invites.created}</p>
              <p className="select-all font-mono text-4xl font-bold tracking-widest text-ink-900">{created.code}</p>
              <ShareButtons code={created.code} />
            </section>
          )}
        </div>

        <section className="flex min-w-0 flex-col gap-3 lg:col-span-3">
          <TextField label={hiAdmin.invites.search} value={query} onChange={(event) => setQuery(event.target.value)} />
          <LoadState data={invites.data} errorCode={invites.errorCode} reload={invites.reload}>
            {(items) => {
              const shown = items.filter((invite) => inviteStatus(invite) === status && (!term || `${invite.code} ${invite.note ?? ''}`.toLowerCase().includes(term)));
              return (
                <>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((item) => (
                      <Chip
                        key={item}
                        label={`${hiAdmin.invites.status[item]} (${items.filter((invite) => inviteStatus(invite) === item).length})`}
                        selected={status === item}
                        onClick={() => setStatus(item)}
                      />
                    ))}
                  </div>
                  {shown.length === 0 ? (
                    <EmptyState icon={LuTicket} message={hiAdmin.invites.none} />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {shown.map((invite) => (
                        <InviteCard
                          key={invite.id}
                          invite={invite}
                          onRevoked={() => {
                            if (created?.id === invite.id) setCreated(null);
                            invites.reload();
                          }}
                        />
                      ))}
                    </ul>
                  )}
                </>
              );
            }}
          </LoadState>
        </section>
      </div>
    </div>
  );
}

function InviteOnlySwitch() {
  const flags = useLoad(fetchAdminFlags, []);
  const flag = flags.data?.find((item) => item.key === 'inviteOnly');
  if (!flag) return null;
  const on = flag.state === 'all';
  const text = hiAdmin.invites;
  return (
    <section className={`${PANEL} flex flex-col gap-3 md:flex-row md:items-center`}>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold">{on ? text.requiredOn : text.requiredOff}</p>
        <p className="text-sm text-ink-700">{text.intro}</p>
      </div>
      <div className="md:w-80">
        <ConfirmAction question={on ? text.turnOffAsk : text.turnOnAsk} onConfirm={() => runAdminAction(() => setAdminFlag(flag.key, on ? 'off' : 'all'), hiAdmin.flags.saved, flags.reload)}>
          {(ask) => (
            <Button variant="secondary" size="md" onClick={ask}>
              {on ? text.turnOff : text.turnOn}
            </Button>
          )}
        </ConfirmAction>
      </div>
    </section>
  );
}

function CreateCode({ onCreated }: { onCreated: (invite: Invite) => void }) {
  const [uses, setUses] = useState('1');
  const [role, setRole] = useState<RoleChoice>('any');
  const [note, setNote] = useState('');
  const [days, setDays] = useState<string>('30');
  const [busy, setBusy] = useState(false);
  const text = hiAdmin.invites;
  const usesOk = Number(uses) >= 1 && Number(uses) <= MAX_USES;
  const daysOk = days === '' || (Number(days) >= 1 && Number(days) <= MAX_DAYS);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !usesOk || !daysOk) return;
    setBusy(true);
    await runAdminAction(
      async () =>
        onCreated(
          await createInvite({
            maxUses: Number(uses),
            ...(role !== 'any' && { role }),
            ...(note.trim() && { note: note.trim() }),
            ...(days && { expiresInDays: Number(days) }),
          }),
        ),
      text.created,
      () => setNote(''),
    );
    setBusy(false);
  };

  return (
    <form onSubmit={(event) => void submit(event)} className={`${PANEL} flex flex-col gap-4`} noValidate>
      <h2 className="text-lg font-bold">{text.create}</h2>
      <TextField label={text.note} value={note} maxLength={80} onChange={(event) => setNote(event.target.value)} />
      <TextField
        label={text.maxUses}
        inputMode="numeric"
        value={uses}
        error={usesOk ? undefined : text.usesInvalid}
        onChange={(event) => setUses(event.target.value.replace(/\D/g, '').slice(0, 3))}
      />
      <fieldset>
        <legend className="mb-2 text-base font-bold">{text.role}</legend>
        <div className="flex flex-wrap gap-2">
          {(['any', 'seller', 'buyer'] as const).map((choice) => (
            <Chip key={choice} label={choice === 'any' ? text.anyRole : roleLabels[choice]} selected={role === choice} onClick={() => setRole(choice)} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-base font-bold">{text.validity}</legend>
        <div className="flex flex-wrap gap-2">
          {DAY_CHOICES.map((choice) => (
            <Chip key={choice || 'never'} label={choice ? `${choice} ${text.dayUnit}` : text.forever} selected={days === choice} onClick={() => setDays(choice)} />
          ))}
        </div>
      </fieldset>
      <Button type="submit" variant="accent" size="md" icon={LuPlus} disabled={busy || !usesOk || !daysOk}>
        {text.create}
      </Button>
    </form>
  );
}

function ShareButtons({ code }: { code: string }) {
  const text = hiAdmin.invites;
  const message = `${text.shareText} ${code}\n${window.location.origin}/#/register`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      notifySuccess(`${text.copied}: ${code}`);
    } catch {
      notifyWarning(`${text.copyFailed}: ${code}`);
    }
  };
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button variant="secondary" size="md" icon={LuCopy} onClick={() => void copy()}>
        {text.copy}
      </Button>
      <a
        href={whatsappShareUrl(message)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary-700 bg-surface px-3 text-base font-bold text-primary-700"
      >
        <LuShare2 aria-hidden="true" className="size-5" />
        {text.share}
      </a>
    </div>
  );
}

function InviteCard({ invite, onRevoked }: { invite: Invite; onRevoked: () => void }) {
  const text = hiAdmin.invites;
  const status = inviteStatus(invite);
  return (
    <li className={`${PANEL} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="select-all font-mono text-2xl font-bold tracking-widest text-ink-900">{invite.code}</span>
        <Badge tone={STATUS_TONE[status]} label={text.status[status]} />
        <span className="text-base tabular-nums text-ink-700">
          {invite.uses}/{invite.maxUses} {text.used}
        </span>
      </div>
      <p className="text-sm text-ink-700">
        {invite.role ? roleLabels[invite.role] : text.anyRole}
        {invite.note && ` · ${invite.note}`}
        {` · ${invite.expiresAt ? `${text.until} ${formatDate(invite.expiresAt)}` : text.forever}`}
      </p>
      {status === 'active' && (
        <>
          <ShareButtons code={invite.code} />
          <ConfirmAction question={`${invite.code}: ${text.revokeAsk}`} onConfirm={() => runAdminAction(() => revokeInvite(invite.id), text.revoked, onRevoked)}>
            {(ask) => (
              <Button variant="ghost" size="md" icon={LuBan} onClick={ask}>
                {text.revoke}
              </Button>
            )}
          </ConfirmAction>
        </>
      )}
    </li>
  );
}
