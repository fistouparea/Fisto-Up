import { useState } from 'react';
import { LuCheck, LuLocateFixed, LuX } from 'react-icons/lu';
import type { SearchFilters, SortOrder } from '../../api/marketTypes';
import { DISTRICTS } from '../../data/locations';
import { useLang } from '../../hooks/useLang';
import { paiseToRupeesInput, rupeesToPaise } from '../../utils/money';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';

const RADII = [25, 50, 100] as const;
const SORTS: SortOrder[] = ['newest', 'price_asc', 'price_desc'];
const canUseGps = typeof window !== 'undefined' && window.isSecureContext && 'geolocation' in navigator;

interface FilterPanelProps {
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
}

/** Price, quantity, bulk only, distance and sort. Changes apply when the buyer taps "दिखाएँ". */
export function FilterPanel({ filters, onApply, onClose }: FilterPanelProps) {
  const { t } = useLang();
  const [draft, setDraft] = useState(filters);
  const [minPrice, setMinPrice] = useState(paiseToRupeesInput(filters.minPrice ?? null));
  const [maxPrice, setMaxPrice] = useState(paiseToRupeesInput(filters.maxPrice ?? null));
  const [minQty, setMinQty] = useState(filters.minQty ? String(filters.minQty) : '');
  const set = (change: Partial<SearchFilters>) => setDraft((current) => ({ ...current, ...change }));

  const apply = () =>
    onApply({
      ...draft,
      minPrice: rupeesToPaise(minPrice) ?? undefined,
      maxPrice: rupeesToPaise(maxPrice) ?? undefined,
      minQty: Number(minQty) > 0 ? Number(minQty) : undefined,
    });

  const useGps = () =>
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => set({ near: { lat: coords.latitude, lon: coords.longitude, label: t.useGps, radiusKm: draft.near?.radiusKm ?? 50 } }),
      () => undefined,
      { timeout: 15_000, maximumAge: 600_000 },
    );

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-4 shadow-raised" aria-label={t.filters}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">{t.filters}</h3>
        <button type="button" onClick={onClose} aria-label={t.back} className="flex size-12 items-center justify-center rounded-full hover:bg-primary-50">
          <LuX aria-hidden="true" className="size-6" />
        </button>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-bold">{t.sortBy}</legend>
        <div className="flex flex-wrap gap-2">
          {SORTS.map((sort) => (
            <Chip key={sort} label={t.sort[sort]} selected={draft.sort === sort} onClick={() => set({ sort })} />
          ))}
        </div>
      </fieldset>

      <p className="-mb-2 text-lg font-bold">{t.priceRange}</p>
      <div className="grid grid-cols-2 items-end gap-3">
        <TextField label={t.min} prefix="₹" inputMode="decimal" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
        <TextField label={t.max} prefix="₹" inputMode="decimal" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
      </div>
      <TextField label={t.minQty} inputMode="numeric" value={minQty} onChange={(e) => setMinQty(e.target.value.replace(/\D/g, ''))} />
      <Chip label={t.bulkOnly} selected={draft.bulk === true} onClick={() => set({ bulk: draft.bulk ? undefined : true })} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-bold">{t.from}</legend>
        <div className="flex flex-wrap gap-2">
          {canUseGps && (
            <Button variant="secondary" size="md" fullWidth={false} icon={LuLocateFixed} onClick={useGps}>
              {t.useGps}
            </Button>
          )}
          {DISTRICTS.flatMap((district) =>
            district.tehsils.map((tehsil) => (
              <Chip
                key={`${district.name}-${tehsil.name}`}
                label={tehsil.name}
                selected={draft.near?.label === tehsil.name}
                onClick={() => set({ near: { lat: tehsil.lat, lon: tehsil.lon, label: tehsil.name, radiusKm: draft.near?.radiusKm ?? 50 } })}
              />
            )),
          )}
        </div>
        {draft.near && (
          <>
            <p className="mt-2 text-lg font-bold">{t.near}</p>
            <div className="flex flex-wrap gap-2">
              {RADII.map((km) => (
                <Chip
                  key={km}
                  label={`${km} ${t.km}`}
                  selected={draft.near?.radiusKm === km}
                  onClick={() => draft.near && set({ near: { ...draft.near, radiusKm: km } })}
                />
              ))}
              <Chip
                label={t.anywhere}
                selected={draft.near.radiusKm === undefined}
                onClick={() => draft.near && set({ near: { ...draft.near, radiusKm: undefined } })}
              />
            </div>
          </>
        )}
      </fieldset>

      <div className="flex gap-2">
        <Button variant="accent" icon={LuCheck} onClick={apply} className="flex-1">
          {t.showResults}
        </Button>
        <Button
          variant="ghost"
          fullWidth={false}
          className="whitespace-nowrap px-3"
          onClick={() => onApply({ sort: 'newest', category: filters.category, product: filters.product, q: filters.q })}
        >
          {t.clear}
        </Button>
      </div>
    </section>
  );
}
