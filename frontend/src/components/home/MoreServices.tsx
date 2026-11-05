import type { IconType } from 'react-icons';
import { LuLandmark, LuPawPrint, LuTractor, LuTruck, LuUsers } from 'react-icons/lu';
import type { FlagKey } from '../../api/flags';
import { useFlags } from '../../hooks/useFlags';
import { routes } from '../../hooks/useHashRoute';
import { hi } from '../../strings/hi';
import { navigateTo } from '../../utils/navigate';
import { SelectCard } from '../ui/SelectCard';

interface ServiceTile {
  flag: FlagKey;
  href: string;
  icon: IconType;
  label: () => string;
}

/** Phase 5 features on the home screen, each only when its feature flag is on for this person. */
const TILES: ServiceTile[] = [
  { flag: 'schemes', href: routes.schemes, icon: LuLandmark, label: () => hi.home.tiles.schemes },
  { flag: 'equipment', href: routes.services('equipment'), icon: LuTractor, label: () => hi.home.tiles.equipment },
  { flag: 'labour', href: routes.services('labour'), icon: LuUsers, label: () => hi.home.tiles.labour },
  { flag: 'mandiPool', href: routes.mandiTrips, icon: LuTruck, label: () => hi.home.tiles.mandiTrips },
  { flag: 'livestock', href: routes.services('livestock'), icon: LuPawPrint, label: () => hi.home.tiles.livestock },
];

export function MoreServices() {
  const flags = useFlags();
  const tiles = TILES.filter((tile) => flags[tile.flag]);
  if (tiles.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={hi.home.moreServices}>
      <h3 className="text-xl font-bold text-ink-900">{hi.home.moreServices}</h3>
      <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
        {tiles.map((tile) => (
          <SelectCard key={tile.href} icon={tile.icon} label={tile.label()} selected={false} onClick={() => navigateTo(tile.href)} />
        ))}
      </div>
    </section>
  );
}
