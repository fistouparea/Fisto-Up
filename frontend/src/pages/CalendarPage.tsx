import { LuCalendarDays, LuSprout } from 'react-icons/lu';
import { CropCalendarCard } from '../components/calendar/CropCalendarCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { useCalendar } from '../hooks/useCalendar';
import { routes } from '../hooks/useHashRoute';
import { hi } from '../strings/hi';

export function CalendarPage() {
  const { data, loading, hasCrops } = useCalendar();

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.calendar.title} icon={LuCalendarDays} />

      {!hasCrops && (
        <EmptyState icon={LuSprout} message={hi.calendar.noCrops}>
          <Button variant="accent" icon={LuSprout} onClick={() => (window.location.hash = routes.farmSetup)}>
            {hi.water.addCrops}
          </Button>
        </EmptyState>
      )}

      {hasCrops && !data && loading && <Skeleton className="h-96" />}
      {data?.crops.map((info) => <CropCalendarCard key={info.crop} info={info} />)}
    </section>
  );
}
