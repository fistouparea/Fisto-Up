import { LuCloudSun, LuMapPin, LuRefreshCw } from 'react-icons/lu';
import { AlertCard } from '../components/weather/AlertCard';
import { ForecastList } from '../components/weather/ForecastList';
import { WeatherTodayCard } from '../components/weather/WeatherTodayCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { routes } from '../hooks/useHashRoute';
import { useFarmProfile } from '../hooks/useFarmProfile';
import { useWeather } from '../hooks/useWeather';
import { errorMessages, hi } from '../strings/hi';
import { locationLabel } from '../utils/farmLabels';

export function WeatherPage() {
  const { profile } = useFarmProfile();
  const { data, loading, errorCode, reload, hasLocation, profileLoaded } = useWeather();

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.weather.title} icon={LuCloudSun} />

      {profileLoaded && !hasLocation && (
        <EmptyState icon={LuMapPin} message={hi.weather.needLocation}>
          <Button variant="accent" icon={LuMapPin} onClick={() => (window.location.hash = routes.farmSetup)}>
            {hi.weather.addLocation}
          </Button>
        </EmptyState>
      )}

      {hasLocation && !data && loading && <WeatherSkeleton />}

      {hasLocation && !data && !loading && errorCode && (
        <EmptyState icon={LuCloudSun} tone="warning" message={errorMessages[errorCode]}>
          <Button variant="accent" icon={LuRefreshCw} onClick={reload}>
            {hi.tryAgain}
          </Button>
        </EmptyState>
      )}

      {data?.forecast && (
        <>
          <WeatherTodayCard forecast={data.forecast} place={profile?.location ? locationLabel(profile.location) : undefined} />
          {data.alerts.map((alert) => (
            <AlertCard key={alert.type} alert={alert} />
          ))}
          <PageHeader title={hi.weather.next7} />
          <ForecastList days={data.forecast.days} />
        </>
      )}
    </section>
  );
}

function WeatherSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label={hi.history.loading}>
      <Skeleton className="h-44" />
      <Skeleton className="h-96" />
    </div>
  );
}
