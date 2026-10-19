import { useState } from 'react';
import { LuLocateFixed, LuMapPin } from 'react-icons/lu';
import type { FarmLocation } from '../../api/types';
import { DISTRICTS, nearestTehsil } from '../../data/locations';
import { locationLabel } from '../../utils/farmLabels';
import { hi } from '../../strings/hi';
import { Button } from '../ui/Button';
import { Callout } from '../ui/Callout';
import { notifyWarning } from '../ui/notify';
import { PageHeader } from '../ui/PageHeader';
import { SelectCard } from '../ui/SelectCard';

interface LocationStepProps {
  value: FarmLocation | undefined;
  onChange: (location: FarmLocation) => void;
}

/** GPS only works on HTTPS pages (or localhost); otherwise the list is the way. */
const canUseGps = typeof window !== 'undefined' && window.isSecureContext && 'geolocation' in navigator;

export function LocationStep({ value, onChange }: LocationStepProps) {
  const [locating, setLocating] = useState(false);
  const [district, setDistrict] = useState(value?.district ?? DISTRICTS[0]?.name);
  const tehsils = DISTRICTS.find((entry) => entry.name === district)?.tehsils ?? [];

  const useGps = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const near = nearestTehsil(coords.latitude, coords.longitude);
        onChange({
          lat: coords.latitude,
          lon: coords.longitude,
          source: 'gps',
          ...(near ? { district: near.district, tehsil: near.tehsil.name } : {}),
        });
      },
      () => {
        setLocating(false);
        notifyWarning(hi.farm.location.gpsFailed);
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={hi.farm.location.question} icon={LuMapPin} />

      {value && <Callout tone="success" icon={LuMapPin} text={locationLabel(value)} />}

      {canUseGps && (
        <Button variant="accent" size="lg" icon={LuLocateFixed} onClick={useGps} disabled={locating}>
          {locating ? hi.farm.location.locating : hi.farm.location.useGps}
        </Button>
      )}

      {DISTRICTS.length > 1 && (
        <>
          <h3 className="text-xl font-bold text-ink-900">{hi.farm.location.chooseDistrict}</h3>
          <div className="grid grid-cols-2 gap-3">
            {DISTRICTS.map((entry) => (
              <SelectCard key={entry.name} label={entry.name} selected={entry.name === district} onClick={() => setDistrict(entry.name)} />
            ))}
          </div>
        </>
      )}

      <h3 className="text-xl font-bold text-ink-900">
        {canUseGps ? hi.farm.location.orPick : hi.farm.location.chooseTehsil} ({district})
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {tehsils.map((tehsil) => (
          <SelectCard
            key={tehsil.name}
            label={tehsil.name}
            selected={value?.source === 'list' && value.tehsil === tehsil.name}
            onClick={() =>
              onChange({ lat: tehsil.lat, lon: tehsil.lon, source: 'list', district, tehsil: tehsil.name })
            }
            className="min-h-20"
          />
        ))}
      </div>
    </div>
  );
}
