import { LuMapPin, LuPencil, LuRuler, LuSprout } from 'react-icons/lu';
import { CropIcon } from '../components/CropIcon';
import { Button } from '../components/ui/Button';
import { MyDataLink } from '../components/MyDataLink';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { IRRIGATION_OPTIONS } from '../data/irrigation';
import { routes } from '../hooks/useHashRoute';
import { useFarmProfile } from '../hooks/useFarmProfile';
import { cropLabels, hi } from '../strings/hi';
import { locationLabel } from '../utils/farmLabels';
import { daysBetween, todayInIndia } from '../utils/indiaDate';

const goToSetup = () => (window.location.hash = routes.farmSetup);

/** "मेरा खेत": what the app knows about the farm, with one button to change it. */
export function FarmPage() {
  const { profile } = useFarmProfile();

  if (profile === undefined) {
    return <Skeleton className="h-64" />;
  }

  if (profile === null) {
    return (
      <section className="flex flex-col gap-4">
        <PageHeader title={hi.farm.title} icon={LuSprout} />
        <EmptyState icon={LuSprout} message={hi.farm.empty}>
          <Button variant="accent" icon={LuPencil} onClick={goToSetup}>
            {hi.farm.fill}
          </Button>
        </EmptyState>
        <MyDataLink />
      </section>
    );
  }

  const today = todayInIndia();
  const irrigation = profile.irrigation ? IRRIGATION_OPTIONS[profile.irrigation] : null;
  const locationText = profile.location ? locationLabel(profile.location) : hi.farm.notSet;
  const sizeText = profile.fieldSizeBigha ? `${profile.fieldSizeBigha} ${hi.farm.field.bigha}` : hi.farm.notSet;

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.farm.title} icon={LuSprout} />

      <Card icon={LuMapPin} title={hi.farm.steps.location} speakText={`${hi.farm.steps.location}: ${locationText}`}>
        <p className="text-xl font-bold">{locationText}</p>
      </Card>

      <Card icon={LuSprout} title={hi.farm.steps.crops} speakText={hi.farm.steps.crops}>
        {profile.crops.length === 0 ? (
          <p>{hi.farm.notSet}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {profile.crops.map((entry) => (
              <li key={entry.crop} className="flex items-center gap-3">
                <CropIcon crop={entry.crop} className="size-12" />
                <span className="flex-1 text-xl font-bold">{cropLabels[entry.crop].hindi}</span>
                <span className="text-base text-ink-500">
                  {daysBetween(entry.sowingDate, today)} {hi.farm.crops.ago}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        icon={irrigation?.icon ?? LuRuler}
        title={hi.farm.steps.field}
        speakText={`${sizeText}। ${irrigation?.label ?? ''}`}
      >
        <p className="text-xl font-bold">{sizeText}</p>
        <p>{irrigation?.label ?? hi.farm.notSet}</p>
      </Card>

      <Button variant="secondary" icon={LuPencil} onClick={goToSetup}>
        {hi.farm.edit}
      </Button>
      <MyDataLink />
    </section>
  );
}
