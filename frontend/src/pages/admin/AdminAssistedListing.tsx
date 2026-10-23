import { useState } from 'react';
import { LuArrowRight, LuHandshake, LuStore, LuUserPen } from 'react-icons/lu';
import { createAssistedListing, fetchSellers, type AdminSeller, type ConsentMethod } from '../../api/admin';
import { LoadState } from '../../components/admin/LoadState';
import { SnapListFlow } from '../../components/market/SnapListFlow';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { Chip } from '../../components/ui/Chip';
import { SelectCard } from '../../components/ui/SelectCard';
import { TextField } from '../../components/ui/TextField';
import { routes } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { hi } from '../../strings/hi';
import { navigateTo } from '../../utils/navigate';

const CONSENT_METHODS: ConsentMethod[] = ['verbal', 'thumbprint', 'signed'];

/**
 * A coordinator lists produce for a seller who cannot use the app. The seller's consent (how it was given,
 * plus a note) is saved with the listing. The listing flow itself is the same Snap & List as for sellers.
 */
export function AdminAssistedListing() {
  const [seller, setSeller] = useState<AdminSeller | null>(null);
  const [method, setMethod] = useState<ConsentMethod | null>(null);
  const [note, setNote] = useState('');
  const [started, setStarted] = useState(false);
  const [query, setQuery] = useState('');
  const { data, errorCode, reload } = useLoad(() => fetchSellers('verified'), []);

  if (started && seller && method) {
    const consent = { method, ...(note.trim() && { note: note.trim() }) };
    return (
      <SnapListFlow
        submit={(listing) => createAssistedListing(listing, seller.id, consent)}
        onFinished={() => navigateTo(routes.admin('overview'))}
        finishLabel={hi.admin.backToPanel}
        header={
          <div className="flex flex-col gap-2">
            <Callout tone="neutral" icon={LuHandshake} text={`${hi.admin.forSeller}: ${seller.name}, ${seller.village ?? ''} · ${hi.admin.consentMethods[method]}`} />
            <Button variant="ghost" size="md" icon={LuUserPen} onClick={() => setStarted(false)}>
              {hi.admin.changeSeller}
            </Button>
          </div>
        }
      />
    );
  }

  const term = query.trim().toLowerCase();
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-bold">{hi.admin.chooseSeller}</h3>
      <input
        aria-label={hi.admin.search}
        placeholder={hi.admin.search}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg focus:border-primary-700 focus:outline-none"
      />
      <LoadState data={data} errorCode={errorCode} reload={reload}>
        {(sellers) => (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {sellers
              .filter((candidate) => !term || [candidate.name, candidate.phone, candidate.village ?? ''].some((value) => value.toLowerCase().includes(term)))
              .slice(0, 24)
              .map((candidate) => (
                <SelectCard
                  key={candidate.id}
                  icon={LuStore}
                  label={candidate.name}
                  sublabel={`${candidate.village ?? ''} · ${candidate.phone}`}
                  selected={seller?.id === candidate.id}
                  onClick={() => setSeller(candidate)}
                />
              ))}
          </div>
        )}
      </LoadState>

      <h3 className="text-xl font-bold">{hi.admin.consent}</h3>
      <div className="flex flex-wrap gap-2">
        {CONSENT_METHODS.map((option) => (
          <Chip key={option} label={hi.admin.consentMethods[option]} selected={method === option} onClick={() => setMethod(option)} />
        ))}
      </div>
      <TextField label={hi.admin.consentNote} value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />

      {(!seller || !method) && <p className="text-base text-ink-500">{hi.admin.consentNeeded}</p>}
      <Button variant="accent" size="lg" icon={LuArrowRight} disabled={!seller || !method} onClick={() => setStarted(true)}>
        {hi.sell.next}
      </Button>
    </div>
  );
}
