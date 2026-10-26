import { useState } from 'react';
import { LuPencil, LuSave, LuX } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { fetchAdminSchemes, updateScheme, type Scheme } from '../../api/schemes';
import { LoadState } from '../../components/admin/LoadState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { TextField } from '../../components/ui/TextField';
import { notifyError, notifySuccess } from '../../components/ui/notify';
import { useLoad } from '../../hooks/useLoad';
import { hi } from '../../strings/hi';

const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

/** Coordinators correct and complete scheme data from the official sites (every save is audited). */
export function AdminSchemes() {
  const { data, errorCode, reload } = useLoad(fetchAdminSchemes, []);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-ink-700">{hi.schemes.admin.intro}</p>
      <LoadState data={data} errorCode={errorCode} reload={reload}>
        {(items) => (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((scheme) => (
              <SchemeEditor key={scheme.id} scheme={scheme} onSaved={reload} />
            ))}
          </div>
        )}
      </LoadState>
    </div>
  );
}

function SchemeEditor({ scheme, onSaved }: { scheme: Scheme; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    summary: scheme.summary,
    whoCanApply: scheme.whoCanApply.join('\n'),
    documents: scheme.documents.join('\n'),
    officialLink: scheme.officialLink,
    helpline: scheme.helpline ?? '',
    source_url: scheme.source_url,
    last_verified: scheme.last_verified ?? '',
    status: scheme.status,
  }));
  const [busy, setBusy] = useState(false);
  const set = (change: Partial<typeof form>) => setForm((current) => ({ ...current, ...change }));

  const save = async () => {
    setBusy(true);
    try {
      await updateScheme(scheme.id, {
        summary: form.summary.trim(),
        whoCanApply: lines(form.whoCanApply),
        documents: lines(form.documents),
        officialLink: form.officialLink.trim(),
        helpline: form.helpline.trim(),
        source_url: form.source_url.trim(),
        ...(form.last_verified && { last_verified: form.last_verified }),
        status: form.status,
      });
      notifySuccess(hi.schemes.admin.saved);
      setEditing(false);
      onSaved();
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-lg font-bold">{scheme.name}</h3>
        <Badge tone={scheme.status === 'verified' ? 'success' : 'warning'} label={scheme.status === 'verified' ? hi.schemes.verified : hi.schemes.verifyBadge} />
      </div>
      <p className="text-sm text-ink-500">
        {hi.schemes.lastVerified}: {scheme.last_verified ?? '—'} · {scheme.source_url}
      </p>
      {!editing ? (
        <Button variant="secondary" size="md" icon={LuPencil} onClick={() => setEditing(true)}>
          {hi.schemes.admin.edit}
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          <Area label={hi.schemes.admin.summary} value={form.summary} onChange={(summary) => set({ summary })} />
          <Area label={hi.schemes.admin.whoCanApply} value={form.whoCanApply} onChange={(whoCanApply) => set({ whoCanApply })} />
          <Area label={hi.schemes.admin.documents} value={form.documents} onChange={(documents) => set({ documents })} />
          <TextField label={hi.schemes.officialSite} value={form.officialLink} onChange={(e) => set({ officialLink: e.target.value })} />
          <TextField label={hi.schemes.helpline} value={form.helpline} inputMode="tel" onChange={(e) => set({ helpline: e.target.value })} />
          <TextField label={hi.schemes.admin.source} value={form.source_url} onChange={(e) => set({ source_url: e.target.value })} />
          <TextField label={hi.schemes.lastVerified} type="date" value={form.last_verified} onChange={(e) => set({ last_verified: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <Chip label={hi.schemes.verified} selected={form.status === 'verified'} onClick={() => set({ status: 'verified' })} />
            <Chip label={hi.schemes.verifyBadge} selected={form.status === 'verify'} onClick={() => set({ status: 'verify' })} />
          </div>
          <p className="text-sm text-ink-500">{hi.schemes.admin.rule}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="accent" size="md" icon={LuSave} disabled={busy} onClick={() => void save()}>
              {hi.save}
            </Button>
            <Button variant="ghost" size="md" icon={LuX} onClick={() => setEditing(false)}>
              {hi.sell.actions.cancel}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-lg font-bold">
      {label}
      <textarea
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border-2 border-line p-3 text-base font-normal focus:border-primary-700 focus:outline-none"
      />
    </label>
  );
}
