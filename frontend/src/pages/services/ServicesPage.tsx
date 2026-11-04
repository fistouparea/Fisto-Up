import { useState } from 'react';
import { LuClipboardList, LuMapPinned, LuPlus, LuScale } from 'react-icons/lu';
import { searchServices } from '../../api/services';
import { ServiceCard } from '../../components/services/ServiceCard';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { SERVICE_KIND_INFO, type ServiceKind, type ServiceSide } from '../../data/serviceKinds';
import { useFarmProfile } from '../../hooks/useFarmProfile';
import { useFlags } from '../../hooks/useFlags';
import { routes } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { hi } from '../../strings/hi';
import { dayLabel } from '../../utils/dayLabel';
import { addDays, todayInIndia } from '../../utils/indiaDate';
import { navigateTo } from '../../utils/navigate';

/** Browse machines / workers / work needs / animals near the farm. One screen for every kind. */
export function ServicesPage({ kind, side }: { kind: ServiceKind; side: ServiceSide }) {
  const flags = useFlags();
  const info = SERVICE_KIND_INFO[kind];
  const text = hi.services.kinds[kind];
  const { profile } = useFarmProfile();
  const [typeId, setTypeId] = useState<string | undefined>();
  const [date, setDate] = useState<string | undefined>();
  /** Nothing within the default radius: the farmer can look everywhere (sorted without distance). */
  const [anywhere, setAnywhere] = useState(false);
  const location = anywhere ? undefined : profile?.location;
  const on = flags[info.flag];
  const { data, errorCode } = useLoad(
    () =>
      on
        ? searchServices({
            kind,
            side,
            ...(kind === 'labour' ? { skill: typeId } : { typeId }),
            date,
            ...(location && { lat: location.lat, lon: location.lon }),
          })
        : Promise.resolve([]),
    [on, kind, side, typeId, date, location?.lat, location?.lon],
  );

  if (!on) return <EmptyState icon={info.icon} message={hi.schemes.off} />;
  const today = todayInIndia();
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={text.title} icon={info.icon} />
      {kind === 'livestock' && <Callout tone="warning" icon={LuScale} text={hi.services.livestock.legal} />}
      {kind === 'labour' && (
        <div className="grid grid-cols-2 gap-2" role="tablist">
          {(['offer', 'need'] as const).map((tab) => (
            <Chip key={tab} label={hi.services.labourTabs[tab]} selected={side === tab} onClick={() => navigateTo(routes.services('labour', tab))} />
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <Button variant="accent" size="md" icon={LuPlus} onClick={() => navigateTo(routes.serviceNew(kind, kind === 'labour' && side === 'offer' ? 'need' : 'offer'))}>
          {kind === 'labour' && side === 'offer' ? hi.services.labourAddNeed : text.add}
        </Button>
        <Button variant="secondary" size="md" icon={LuClipboardList} onClick={() => navigateTo(routes.servicesMine)}>
          {hi.services.mine}
        </Button>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label={kind === 'labour' ? hi.services.skills : hi.services.type}>
        <Chip label={hi.market.all} selected={!typeId} onClick={() => setTypeId(undefined)} />
        {Object.entries(info.types).map(([id, label]) => (
          <Chip key={id} label={label} selected={typeId === id} onClick={() => setTypeId(typeId === id ? undefined : id)} />
        ))}
      </div>
      {info.bookedByDate && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label={hi.services.when}>
          <Chip label={hi.services.anyDay} selected={!date} onClick={() => setDate(undefined)} />
          {days.map((day) => (
            <Chip key={day} label={dayLabel(day, today)} selected={date === day} onClick={() => setDate(date === day ? undefined : day)} />
          ))}
        </div>
      )}
      {!location && <p className="text-base text-ink-500">{hi.services.location}</p>}
      {data === undefined && !errorCode && <Skeleton className="h-48" />}
      {errorCode && data === undefined && <EmptyState icon={info.icon} tone="warning" message={hi.schemes.loadFailed} />}
      {data?.length === 0 && (
        <EmptyState icon={info.icon} message={text.empty}>
          {location && (
            <Button variant="secondary" icon={LuMapPinned} onClick={() => setAnywhere(true)}>
              {hi.services.lookEverywhere}
            </Button>
          )}
        </EmptyState>
      )}
      <div className="flex flex-col gap-3">
        {data?.map((listing) => (
          <ServiceCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}
