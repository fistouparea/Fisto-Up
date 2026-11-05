import { LuPawPrint } from 'react-icons/lu';
import { LIVESTOCK_ANIMALS, LIVESTOCK_PURPOSES } from '../../../data/serviceKinds';
import { hi } from '../../../strings/hi';
import { Chip } from '../../ui/Chip';
import { NumberStepper } from '../../ui/NumberStepper';
import { SelectCard } from '../../ui/SelectCard';
import { TextField } from '../../ui/TextField';
import type { KindFieldsProps } from './kindFields';

const numberOrUndefined = (text: string) => (text.trim() === '' || Number.isNaN(Number(text)) ? undefined : Number(text));

/** पशु: animal, breed, age, milk, vaccinations, purpose and how many. */
export function LivestockFields({ value, onChange, showErrors }: KindFieldsProps) {
  const details = value.details;
  const set = (change: Record<string, unknown>) => onChange({ ...value, details: { ...details, ...change } });
  const text = (key: string) => (typeof details[key] === 'string' ? (details[key] as string) : '');
  const num = (key: string) => (typeof details[key] === 'number' ? String(details[key]) : '');
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-bold">{hi.services.type}</h3>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(LIVESTOCK_ANIMALS).map(([id, label]) => (
          <SelectCard key={id} icon={LuPawPrint} label={label} selected={value.typeId === id} onClick={() => onChange({ ...value, typeId: id })} className="min-h-24 text-base" />
        ))}
      </div>
      {showErrors && !value.typeId && <p className="font-bold text-danger-700">{hi.services.type}</p>}
      <TextField label={hi.services.livestock.breed} value={text('breed')} maxLength={60} onChange={(event) => set({ breed: event.target.value })} error={showErrors && !text('breed').trim() ? hi.sellerProfile.required : undefined} />
      <TextField label={hi.services.livestock.age} inputMode="decimal" value={num('ageYears')} onChange={(event) => set({ ageYears: numberOrUndefined(event.target.value) })} error={showErrors && details.ageYears === undefined ? hi.sellerProfile.required : undefined} />
      <TextField label={hi.services.livestock.milk} inputMode="decimal" value={num('milkLitresPerDay')} onChange={(event) => set({ milkLitresPerDay: numberOrUndefined(event.target.value) })} />
      <TextField label={hi.services.livestock.vaccination} value={text('vaccinations')} maxLength={300} onChange={(event) => set({ vaccinations: event.target.value })} />
      <h3 className="text-lg font-bold">{hi.services.livestock.purpose}</h3>
      <div className="flex flex-wrap gap-2">
        {Object.entries(LIVESTOCK_PURPOSES).map(([id, label]) => (
          <Chip key={id} label={label} selected={details.purpose === id} onClick={() => set({ purpose: id })} />
        ))}
      </div>
      {showErrors && !details.purpose && <p className="font-bold text-danger-700">{hi.services.livestock.purpose}</p>}
      <h3 className="text-lg font-bold">{hi.services.livestock.count}</h3>
      <NumberStepper value={typeof details.count === 'number' ? details.count : 1} min={1} max={50} onChange={(count) => set({ count: count ?? 1 })} label={hi.services.livestock.count} unitLabel="" lessLabel={hi.sell.less} moreLabel={hi.sell.more} />
    </div>
  );
}
