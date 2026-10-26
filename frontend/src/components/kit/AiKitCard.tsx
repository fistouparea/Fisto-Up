import { LuLandmark, LuMapPin, LuPackageSearch, LuShieldAlert, LuStore } from 'react-icons/lu';
import { fetchKit, type KitItem } from '../../api/inputKit';
import type { Diagnosis } from '../../api/types';
import { useFarmProfile } from '../../hooks/useFarmProfile';
import { useFlags } from '../../hooks/useFlags';
import { routes } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { hi, unitLabels } from '../../strings/hi';
import { rememberKitReferral } from '../../utils/kitReferral';
import { formatRupees } from '../../utils/money';
import { Callout } from '../ui/Callout';
import { Card } from '../ui/Card';

/**
 * "ज़रूरी सामान" after a diagnosis: the generic medicine names, and products of verified input dealers nearby.
 * Partner products are labelled; banned items never come from the server. Hidden when the feature is off.
 */
export function AiKitCard({ diagnosis }: { diagnosis: Diagnosis }) {
  const { aiKit } = useFlags();
  const { profile } = useFarmProfile();
  const names = diagnosis.dawai.map((item) => item.name);
  const location = profile?.location ? { lat: profile.location.lat, lon: profile.location.lon } : undefined;
  const { data } = useLoad(() => (aiKit && names.length > 0 ? fetchKit(names, location) : Promise.resolve(null)), [aiKit, names.join('|'), location?.lat, location?.lon]);

  if (!aiKit || !data || data.items.length === 0) return null;
  const speak = `${hi.kit.title}: ${data.items.map((item) => item.generic?.hi ?? item.name).join(', ')}। ${hi.kit.intro}`;

  return (
    <Card reveal icon={LuPackageSearch} title={hi.kit.title} speakText={speak}>
      <p className="mb-3 text-base text-ink-700">{hi.kit.intro}</p>
      <ul className="flex flex-col gap-3">
        {data.items.map((item) => (
          <KitRow key={item.name} item={item} />
        ))}
      </ul>
      {!location && <p className="mt-3 text-base text-ink-500">{hi.kit.setLocation}</p>}
      <div className="mt-3 flex flex-col gap-3">
        <Callout tone="neutral" icon={LuStore} text={hi.kit.partnerNote} />
        <Callout tone="warning" icon={LuShieldAlert} text={hi.dawaiWarning} />
        <Callout tone="cream" icon={LuLandmark} text={hi.kvkAdvice} />
      </div>
    </Card>
  );
}

function KitRow({ item }: { item: KitItem }) {
  return (
    <li className="rounded-2xl border border-line bg-surface-page p-3">
      <p className="text-xl font-bold">{item.generic?.hi ?? item.name}</p>
      {item.products.length === 0 ? (
        <p className="mt-1 text-base text-ink-500">{hi.kit.noProducts}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {item.products.map((product) => (
            <li key={product.id}>
              <a
                href={routes.listing(product.id)}
                onClick={() => rememberKitReferral(product.id)}
                className="flex min-h-14 flex-col gap-0.5 rounded-xl border-2 border-primary-100 bg-surface p-2 hover:border-primary-300"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent-400 px-2 py-0.5 text-sm font-bold text-ink-900">{hi.kit.partner}</span>
                  <span className="font-bold">{product.title.hi}</span>
                </span>
                <span className="text-base">
                  <strong className="text-primary-700">{formatRupees(product.pricePerUnitPaise)}</strong> / {unitLabels[product.unit].hi}
                </span>
                <span className="flex items-center gap-1 text-sm text-ink-500">
                  <LuMapPin aria-hidden="true" className="size-4 shrink-0" />
                  {product.seller.name}, {product.seller.village}
                  {product.distanceKm !== undefined && ` · ${product.distanceKm} ${hi.kit.away}`}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
