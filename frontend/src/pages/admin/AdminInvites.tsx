import { useState } from 'react';
import { LuBan, LuPlus, LuShare2, LuTicket } from 'react-icons/lu';
import { createInvite, fetchInvites, revokeInvite, type Invite } from '../../api/pilotAdmin';
import { LoadState } from '../../components/admin/LoadState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { NumberStepper } from '../../components/ui/NumberStepper';
import { TextField } from '../../components/ui/TextField';
import { useLoad } from '../../hooks/useLoad';
import { hi, roleLabels } from '../../strings/hi';
import { formatDate } from '../../utils/formatDate';
import { whatsappShareUrl } from '../../utils/share';
import { runAdminAction } from './adminAction';

type RoleChoice = 'any' | 'seller' | 'buyer';

/** Pilot invite codes: make one per person or one for a whole SHG group, share on WhatsApp, revoke. */
export function AdminInvites() {
  const invites = useLoad(fetchInvites, []);
  const [maxUses, setMaxUses] = useState<number | null>(1);
  const [role, setRole] = useState<RoleChoice>('any');
  const [note, setNote] = useState('');
  const [days, setDays] = useState('');

  const create = () =>
    runAdminAction(
      () =>
        createInvite({
          maxUses: maxUses ?? 1,
          ...(role !== 'any' && { role }),
          ...(note.trim() && { note: note.trim() }),
          ...(Number(days) > 0 && { expiresInDays: Number(days) }),
        }),
      hi.admin.invites.created,
      () => {
        setNote('');
        invites.reload();
      },
    );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-ink-700">{hi.admin.invites.intro}</p>
      <section className="flex flex-col gap-4 rounded-3xl border-2 border-line bg-surface p-4">
        <h3 className="text-xl font-bold">{hi.admin.invites.create}</h3>
        <p className="text-base font-bold">{hi.admin.invites.maxUses}</p>
        <NumberStepper value={maxUses} onChange={setMaxUses} label={hi.admin.invites.maxUses} min={1} max={200} lessLabel={hi.sell.less} moreLabel={hi.sell.more} />
        <p className="text-base font-bold">{hi.admin.invites.role}</p>
        <div className="flex flex-wrap gap-2">
          {(['any', 'seller', 'buyer'] as const).map((choice) => (
            <Chip key={choice} label={choice === 'any' ? hi.admin.invites.anyRole : roleLabels[choice]} selected={role === choice} onClick={() => setRole(choice)} />
          ))}
        </div>
        <TextField label={hi.admin.invites.note} value={note} maxLength={80} onChange={(event) => setNote(event.target.value)} />
        <TextField label={hi.admin.invites.days} inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value.replace(/\D/g, '').slice(0, 3))} />
        <Button variant="accent" icon={LuPlus} onClick={() => void create()}>
          {hi.admin.invites.create}
        </Button>
      </section>

      <LoadState data={invites.data} errorCode={invites.errorCode} reload={invites.reload}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon={LuTicket} message={hi.admin.invites.none} />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {items.map((invite) => (
                <InviteCard key={invite.id} invite={invite} onChanged={invites.reload} />
              ))}
            </div>
          )
        }
      </LoadState>
    </div>
  );
}

function InviteCard({ invite, onChanged }: { invite: Invite; onChanged: () => void }) {
  const state = invite.revoked ? hi.admin.invites.revoked : !invite.usable ? hi.admin.invites.expired : null;
  return (
    <article className="flex flex-col gap-3 rounded-3xl border-2 border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-3xl font-bold tracking-widest text-ink-900">{invite.code}</span>
        {state ? <Badge tone="danger" label={state} /> : <Badge tone="success" label={`${invite.uses}/${invite.maxUses} ${hi.admin.invites.used}`} />}
      </div>
      <p className="text-base text-ink-700">
        {invite.role ? roleLabels[invite.role] : hi.admin.invites.anyRole}
        {invite.note && ` · ${invite.note}`}
        {invite.expiresAt && ` · ${formatDate(invite.expiresAt)}`}
      </p>
      {invite.usable && (
        <div className="grid grid-cols-2 gap-2">
          <a
            href={whatsappShareUrl(`${hi.admin.invites.shareText} ${invite.code}\n${window.location.origin}/#/register`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary-700 px-3 text-base font-bold text-primary-700"
          >
            <LuShare2 aria-hidden="true" className="size-5" />
            {hi.admin.invites.share}
          </a>
          <Button variant="ghost" size="md" icon={LuBan} onClick={() => void runAdminAction(() => revokeInvite(invite.id), hi.admin.invites.revoked, onChanged)}>
            {hi.admin.invites.revoke}
          </Button>
        </div>
      )}
    </article>
  );
}
