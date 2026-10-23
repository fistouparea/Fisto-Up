import type { ReactNode } from 'react';
import { LuScanSearch, LuSprout, LuWheat } from 'react-icons/lu';
import type { Dashboard, FarmProfile, MandiPrice } from '../api/types';
import { Greeting } from '../components/home/Greeting';
import { MandiCard } from '../components/home/MandiCard';
import { SeeAllLink } from '../components/home/SeeAllLink';
import { TodayWorkCard } from '../components/home/TodayWorkCard';
import { WaterSummaryCard } from '../components/home/WaterSummaryCard';
import { FollowUpCard } from '../components/notifications/FollowUpCard';
import { PushPermissionCard } from '../components/notifications/PushPermissionCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { AlertCard } from '../components/weather/AlertCard';
import { WeatherTodayCard } from '../components/weather/WeatherTodayCard';
import { useDashboard } from '../hooks/useDashboard';
import { useFarmProfile } from '../hooks/useFarmProfile';
import { useMandi } from '../hooks/useMandi';
import { routes } from '../hooks/useHashRoute';
import { useNotifications } from '../hooks/useNotifications';
import { hi } from '../strings/hi';
import { locationLabel } from '../utils/farmLabels';
import { navigateTo } from '../utils/navigate';

/** Max cards on the home screen, so it stays calm. The photo button comes after them. */
const MAX_CARDS = 5;

export function HomePage() {
  const { profile } = useFarmProfile();
  const { data, loading, reload } = useDashboard();
  const notifications = useNotifications();
  const mandiPrices = useMandi();
  const place = profile?.location ? locationLabel(profile.location) : undefined;

  const onFollowUpAnswered = () => {
    reload();
    notifications.reload();
  };

  return (
    <div className="flex flex-col gap-4">
      <Greeting place={place} />

      {!data && loading && <DashboardSkeleton />}
      {data && dashboardCards(data, mandiPrices, needsFarmInfo(profile), onFollowUpAnswered).slice(0, MAX_CARDS)}

      <Button variant="accent" size="hero" icon={LuScanSearch} onClick={() => navigateTo(routes.diagnose)}>
        {hi.home.photoCheck}
      </Button>
      <MarketButtons />
    </div>
  );
}

/** Cards in order of importance; the caller shows the first few. */
function dashboardCards(
  data: Dashboard,
  mandiPrices: MandiPrice[],
  askForFarmInfo: boolean,
  onFollowUpAnswered: () => void,
): ReactNode[] {
  const [topAlert] = data.alerts;
  const [followUp] = data.followUps;
  return [
    data.forecast && <WeatherTodayCard key="weather" forecast={data.forecast} href={routes.weather} />,
    askForFarmInfo && (
      <EmptyState key="fill" icon={LuSprout} message={hi.home.fillFarm}>
        <Button variant="secondary" icon={LuSprout} onClick={() => navigateTo(routes.farmSetup)}>
          {hi.farm.fill}
        </Button>
      </EmptyState>
    ),
    topAlert && (
      <div key="alert" className="flex flex-col">
        <AlertCard alert={topAlert} compact />
        <SeeAllLink href={routes.weather} />
      </div>
    ),
    followUp && <FollowUpCard key="followup" notification={followUp} onAnswered={onFollowUpAnswered} />,
    data.tasks.length > 0 && <TodayWorkCard key="tasks" tasks={data.tasks} />,
    data.water.length > 0 && <WaterSummaryCard key="water" water={data.water} />,
    mandiPrices.length > 0 && <MandiCard key="mandi" prices={mandiPrices} />,
    <PushPermissionCard key="push" />,
  ].filter(Boolean);
}

/** Weather needs a location and the other cards need crops. */
function needsFarmInfo(profile: FarmProfile | null | undefined): boolean {
  return !profile?.location || profile.crops.length === 0;
}

/** Marketplace entry: sell your produce (login asked on the next screen). */
function MarketButtons() {
  return (
    <Button variant="primary" size="lg" icon={LuWheat} onClick={() => navigateTo(routes.sell)}>
      {hi.sell.sellButton}
      <span className="block text-base font-normal text-primary-100">{hi.sell.sellHint}</span>
    </Button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label={hi.history.loading}>
      <Skeleton className="h-44" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  );
}
