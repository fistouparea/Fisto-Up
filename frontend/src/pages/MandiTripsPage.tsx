import { useState } from 'react';
import { LuRefreshCw, LuTruck } from 'react-icons/lu';
import { ApiError } from '../api/client';
import { fetchTrips, joinTrip, leaveTrip, type MandiTrip } from '../api/mandiTrips';
import type { CropId } from '../api/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { NumberStepper } from '../components/ui/NumberStepper';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { notifyError, notifySuccess } from '../components/ui/notify';
import { useAuth } from '../hooks/useAuth';
import { useFlags } from '../hooks/useFlags';
import { useCachedResource } from '../hooks/useCachedResource';
import { cropLabels, hi, marketErrorMessage } from '../strings/hi';
import { hiF } from '../strings/hiFeatures';
import { shortDate } from '../utils/dayLabel';
import { goToLogin } from '../utils/loginRedirect';

const CROPS: CropId[] = ['bajra', 'guar', 'moong', 'moth', 'chana', 'sarson', 'jeera', 'gehun'];

/** "साथ में मंडी चलें": trips planned by coordinators; join with your produce (one shared vehicle). */
export function MandiTripsPage() {
  const { mandiPool } = useFlags();
  // Saved on the phone: the trip list opens offline too (joining needs internet).
  const { user } = useAuth();
  // One copy per person: it includes "my" place in each trip.
  const { data, errorCode, reload } = useCachedResource(mandiPool ? `mandiTrips.${user?.id ?? 'guest'}` : null, fetchTrips);
  if (!mandiPool) return <EmptyState icon={LuTruck} message={hiF.schemes.off} />;
  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hiF.mandiTrips.title} icon={LuTruck} speakText={`${hiF.mandiTrips.title}. ${hiF.mandiTrips.intro}`} />
      <p className="text-lg text-ink-700" data-read-aloud>
        {hiF.mandiTrips.intro}
      </p>
      {data === undefined && errorCode ? (
        <EmptyState icon={LuTruck} tone="warning" message={marketErrorMessage(errorCode)}>
          <Button variant="accent" icon={LuRefreshCw} onClick={reload}>
            {hi.tryAgain}
          </Button>
        </EmptyState>
      ) : data === undefined ? <Skeleton className="h-48" /> : data.length === 0 ? <EmptyState icon={LuTruck} message={hiF.mandiTrips.empty} /> : data.map((trip) => <TripCard key={trip.id} trip={trip} onChanged={reload} />)}
    </section>
  );
}

function TripCard({ trip, onChanged }: { trip: MandiTrip; onChanged: () => void }) {
  const { user } = useAuth();
  const [crop, setCrop] = useState<CropId>(trip.mine?.crop ?? 'bajra');
  const [quantity, setQuantity] = useState<number>(trip.mine?.quantityQuintal ?? 1);
  const [busy, setBusy] = useState(false);
  const left = trip.capacityQuintal - trip.bookedQuintal;
  const act = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      notifySuccess(done);
      onChanged();
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };
  const speak = `${trip.mandi}, ${shortDate(trip.date)}. ${hiF.mandiTrips.pickup}: ${trip.pickupPoint}. ${hiF.mandiTrips.left}: ${left} ${hiF.mandiTrips.quintal}`;
  return (
    <Card icon={LuTruck} title={`${trip.mandi} · ${shortDate(trip.date)}`} speakText={speak}>
      <p>
        {hiF.mandiTrips.pickup}: <strong>{trip.pickupPoint}</strong> ({trip.tehsil})
      </p>
      <p>
        {hiF.mandiTrips.vehicle}: {trip.vehicle}
      </p>
      <p className="font-bold">
        {hiF.mandiTrips.left}: {left} / {trip.capacityQuintal} {hiF.mandiTrips.quintal} · {trip.members} {hiF.mandiTrips.members}
      </p>
      {trip.status !== 'open' && (
        <p className="font-bold text-warning-800">
          {hiF.mandiTrips.status[trip.status]}
          {trip.status === 'closed' && ` – ${hiF.mandiTrips.closed}`}
        </p>
      )}
      {trip.status === 'open' &&
        (!user ? (
          <Button variant="accent" size="md" className="mt-3" onClick={() => goToLogin()}>
            {hiF.mandiTrips.loginToJoin}
          </Button>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {CROPS.map((id) => (
                <Chip key={id} label={cropLabels[id].hindi} selected={crop === id} onClick={() => setCrop(id)} />
              ))}
            </div>
            <NumberStepper value={quantity} min={1} max={200} onChange={(next) => setQuantity(next ?? 1)} label={hiF.mandiTrips.quintal} unitLabel={hiF.mandiTrips.quintal} lessLabel={hi.sell.less} moreLabel={hi.sell.more} />
            <Button variant="accent" size="lg" disabled={busy} onClick={() => void act(() => joinTrip(trip.id, crop, quantity), hiF.mandiTrips.joined)}>
              {trip.mine ? hiF.mandiTrips.update : hiF.mandiTrips.join}
            </Button>
            {trip.mine && (
              <Button variant="ghost" size="md" disabled={busy} onClick={() => void act(() => leaveTrip(trip.id), hiF.mandiTrips.left)}>
                {hiF.mandiTrips.leave}
              </Button>
            )}
          </div>
        ))}
      <p className="mt-2 text-base text-ink-500">{hiF.services.noPayment}</p>
    </Card>
  );
}
