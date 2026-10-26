import { useState, type FormEvent } from 'react';
import { LuBadgeCheck, LuCircleX, LuPhone, LuSearch, LuUserPlus, LuX } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { createSeller, fetchSellers, rejectSeller, verifySeller, type AdminSeller } from '../../api/admin';
import type { Place, SellerStatus } from '../../api/marketTypes';
import { LoadState } from '../../components/admin/LoadState';
import { TehsilPicker } from '../../components/market/TehsilPicker';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { PhoneField, PinField, TextField } from '../../components/ui/TextField';
import { notifyError, notifySuccess } from '../../components/ui/notify';
import { useLoad } from '../../hooks/useLoad';
import { hi, marketErrorMessage, sellerStatusLabels } from '../../strings/hi';
import { formatDate } from '../../utils/formatDate';

const FILTERS: (SellerStatus | undefined)[] = ['pending', undefined, 'verified', 'rejected'];

export function AdminSellers() {
  const [status, setStatus] = useState<SellerStatus | undefined>('pending');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const { data, errorCode, reload } = useLoad(() => fetchSellers(status, search), [status, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Chip key={filter ?? 'all'} label={filter ? sellerStatusLabels[filter] : hi.admin.all} selected={status === filter} onClick={() => setStatus(filter)} />
        ))}
      </div>
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setSearch(query);
        }}
      >
        <input
          aria-label={hi.admin.search}
          placeholder={hi.admin.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-lg focus:border-primary-700 focus:outline-none"
        />
        <button type="submit" aria-label={hi.admin.search} className="flex size-14 items-center justify-center rounded-2xl bg-primary-700 text-white">
          <LuSearch aria-hidden="true" className="size-6" />
        </button>
      </form>

      {adding ? (
        <AddSellerForm
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            setStatus('verified');
            reload();
          }}
        />
      ) : (
        <Button variant="secondary" icon={LuUserPlus} onClick={() => setAdding(true)}>
          {hi.admin.addSeller}
        </Button>
      )}

      <LoadState data={data} errorCode={errorCode} reload={reload}>
        {(sellers) =>
          sellers.length === 0 ? (
            <EmptyState icon={LuUserPlus} message={hi.admin.noSellers} />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {sellers.map((seller) => (
                <SellerRow key={seller.id} seller={seller} onChanged={reload} />
              ))}
            </div>
          )
        }
      </LoadState>
    </div>
  );
}

function SellerRow({ seller, onChanged }: { seller: AdminSeller; onChanged: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      notifySuccess(message);
      onChanged();
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };

  const [licenceChecked, setLicenceChecked] = useState(false);
  const tone = seller.status === 'verified' ? 'success' : seller.status === 'rejected' ? 'danger' : 'warning';
  const place = [seller.pickup?.address, seller.pickup?.tehsil, seller.pickup?.district].filter(Boolean).join(', ');

  return (
    <article className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-bold">{seller.name}</h3>
        <Badge tone={tone} label={sellerStatusLabels[seller.status]} />
        {seller.assisted && <Badge tone="neutral" label={hi.admin.assisted} />}
        {seller.kind === 'input_dealer' && <Badge tone="neutral" label={hi.sellerKinds.input_dealer} />}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-base">
        <dt className="text-ink-500">{hi.account.phone}</dt>
        <dd>
          <a href={`tel:+91${seller.phone}`} className="inline-flex items-center gap-1 font-bold text-primary-700">
            <LuPhone aria-hidden="true" className="size-4" />
            {seller.phone}
          </a>
        </dd>
        <dt className="text-ink-500">{hi.sellerProfile.village}</dt>
        <dd>{seller.village ?? '—'}</dd>
        {seller.kind === 'input_dealer' && (
          <>
            <dt className="text-ink-500">{hi.licence.number}</dt>
            <dd className="break-all font-bold">
              {seller.licenceNumber ?? '—'} · {seller.licenceVerified ? hi.licence.verified : hi.licence.notVerified}
            </dd>
          </>
        )}
        {seller.shgName && (
          <>
            <dt className="text-ink-500">SHG</dt>
            <dd>{seller.shgName}</dd>
          </>
        )}
        <dt className="text-ink-500">UPI</dt>
        <dd className="break-all">{seller.upiId ?? '—'}</dd>
        <dt className="text-ink-500">{hi.sellerProfile.pickup}</dt>
        <dd>{place || '—'}</dd>
        <dt className="text-ink-500">{hi.admin.listingsCount}</dt>
        <dd>{seller.listings}</dd>
        <dt className="text-ink-500">{hi.admin.joined}</dt>
        <dd>{formatDate(seller.createdAt)}</dd>
      </dl>
      {!seller.profileComplete && <p className="font-bold text-warning-800">{hi.admin.profileIncomplete}</p>}
      {seller.rejectReason && <p className="text-danger-800">{seller.rejectReason}</p>}

      {rejecting ? (
        <div className="flex flex-col gap-2">
          <TextField label={hi.admin.rejectReason} value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="danger"
              size="md"
              disabled={busy || reason.trim().length < 2}
              onClick={() => void act(() => rejectSeller(seller.id, reason.trim()), hi.admin.rejected)}
            >
              {hi.admin.reject}
            </Button>
            <Button variant="secondary" size="md" icon={LuX} onClick={() => setRejecting(false)}>
              {hi.sell.actions.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {seller.status !== 'verified' && seller.kind === 'input_dealer' && (
            <label className="col-span-2 flex min-h-14 items-center gap-3 rounded-2xl border-2 border-line p-3 text-base font-bold">
              <input type="checkbox" className="size-6" checked={licenceChecked} onChange={(event) => setLicenceChecked(event.target.checked)} />
              {hi.licence.checked}
            </label>
          )}
          {seller.status !== 'verified' && (
            <Button
              variant="accent"
              size="md"
              icon={LuBadgeCheck}
              disabled={busy || !seller.profileComplete || (seller.kind === 'input_dealer' && !licenceChecked)}
              onClick={() => void act(() => verifySeller(seller.id, seller.kind === 'input_dealer' && licenceChecked), hi.admin.verified)}
            >
              {hi.admin.verify}
            </Button>
          )}
          {seller.status !== 'rejected' && (
            <Button variant="ghost" size="md" icon={LuCircleX} disabled={busy} onClick={() => setRejecting(true)}>
              {hi.admin.reject}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function AddSellerForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [village, setVillage] = useState('');
  const [shgName, setShgName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [pickup, setPickup] = useState<Place | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pickup || name.trim().length < 2 || !village.trim() || !upiId.trim() || !/^[6-9]\d{9}$/.test(phone) || !/^\d{4}$/.test(pin)) {
      setError(hi.sellerProfile.required);
      return;
    }
    setBusy(true);
    try {
      await createSeller({ name: name.trim(), phone, pin, village: village.trim(), upiId: upiId.trim(), pickup, ...(shgName.trim() && { shgName: shgName.trim() }) });
      notifySuccess(hi.admin.sellerAdded);
      onAdded();
    } catch (failure) {
      setError(marketErrorMessage(failure instanceof ApiError ? failure.code : 'UNKNOWN'));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3 rounded-3xl border-2 border-primary-200 bg-surface p-4" noValidate>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">{hi.admin.addSeller}</h3>
        <button type="button" onClick={onClose} aria-label={hi.sell.actions.cancel} className="flex size-12 items-center justify-center rounded-full hover:bg-primary-50">
          <LuX aria-hidden="true" className="size-6" />
        </button>
      </div>
      <p className="text-base text-ink-500">{hi.admin.addSellerHint}</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextField label={hi.sellerProfile.name} value={name} onChange={(e) => setName(e.target.value)} />
        <PhoneField label={hi.auth.phone} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <PinField label={hi.auth.newPin} hint={hi.auth.pinHint} autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} />
        <TextField label={hi.sellerProfile.village} value={village} onChange={(e) => setVillage(e.target.value)} />
        <TextField label={hi.sellerProfile.shgName} value={shgName} onChange={(e) => setShgName(e.target.value)} />
        <TextField label={hi.sellerProfile.upiId} hint={hi.sellerProfile.upiHint} autoCapitalize="none" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
      </div>
      <h4 className="text-lg font-bold">{hi.sellerProfile.pickup}</h4>
      <TehsilPicker value={pickup} onChange={setPickup} />
      {error && <p className="font-bold text-danger-700">{error}</p>}
      <Button type="submit" variant="accent" icon={LuUserPlus} disabled={busy}>
        {hi.admin.addSeller}
      </Button>
    </form>
  );
}

