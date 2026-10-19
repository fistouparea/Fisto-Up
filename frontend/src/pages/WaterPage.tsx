import { LuDroplets, LuInfo, LuSprout } from 'react-icons/lu';
import { WaterAdviceCard } from '../components/water/WaterAdviceCard';
import { Button } from '../components/ui/Button';
import { Callout } from '../components/ui/Callout';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { WATER_TIP_ICONS } from '../data/waterVisuals';
import { routes } from '../hooks/useHashRoute';
import { useWater } from '../hooks/useWater';
import { hi } from '../strings/hi';

export function WaterPage() {
  const { data, loading, hasCrops, savingCrop, markWatered } = useWater();

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.water.title} icon={LuDroplets} />
      <Callout tone="neutral" icon={LuInfo} text={hi.water.disclaimer} />

      {!hasCrops && (
        <EmptyState icon={LuSprout} message={hi.water.noCrops}>
          <Button variant="accent" icon={LuSprout} onClick={() => (window.location.hash = routes.farmSetup)}>
            {hi.water.addCrops}
          </Button>
        </EmptyState>
      )}

      {hasCrops && !data && loading && <Skeleton className="h-48" />}

      {data?.advice.map((advice) => (
        <WaterAdviceCard
          key={advice.crop}
          advice={advice}
          saving={savingCrop === advice.crop}
          onWatered={() => void markWatered(advice.crop)}
        />
      ))}

      {data && data.tips.length > 0 && (
        <Card icon={LuDroplets} title={hi.water.tipsTitle} speakText={`${hi.water.tipsTitle}। ${data.tips.map((tip) => tip.text).join(' ')}`}>
          <ul className="flex flex-col gap-3">
            {data.tips.map((tip) => {
              const Icon = WATER_TIP_ICONS[tip.id];
              return (
                <li key={tip.id} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <span>{tip.text}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
}
