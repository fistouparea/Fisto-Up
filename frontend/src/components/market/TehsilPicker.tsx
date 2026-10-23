import { DISTRICTS } from '../../data/locations';
import type { Place } from '../../api/marketTypes';
import { SelectCard } from '../ui/SelectCard';

interface TehsilPickerProps {
  value: Place | undefined;
  onChange: (place: Place) => void;
}

/** Tehsil cards (same list as "मेरा खेत"). The tehsil's coordinates are used for "पास में" search. */
export function TehsilPicker({ value, onChange }: TehsilPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      {DISTRICTS.map((district) => (
        <div key={district.name} className="grid grid-cols-2 gap-3">
          {district.tehsils.map((tehsil) => (
            <SelectCard
              key={tehsil.name}
              label={tehsil.name}
              selected={value?.tehsil === tehsil.name && value.district === district.name}
              onClick={() =>
                onChange({ ...value, district: district.name, tehsil: tehsil.name, lat: tehsil.lat, lon: tehsil.lon })
              }
              className="min-h-16"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
