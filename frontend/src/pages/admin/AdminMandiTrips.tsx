import { useState, type FormEvent } from 'react';
import { LuPencil, LuPhone, LuPlus, LuTruck, LuX } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { createTrip, fetchAdminTrips, setTripStatus, TRIP_NEXT, updateTrip, type MandiTrip } from '../../api/mandiTrips';
import { LoadState } from '../../components/admin/LoadState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { TextField } from '../../components/ui/TextField';
import { notifyError, notifySuccess } from '../../components/ui/notify';
import { useLoad } from '../../hooks/useLoad';
import { cropLabels, hi } from '../../strings/hi';
import { shortDate } from '../../utils/dayLabel';
import { paiseToRupeesInput } from '../../utils/money';
import { EMPTY_TRIP_FORM, validateTripForm, type TripForm } from '../../utils/tripForm';

const text = () => hi.mandiTrips.admin;

/** Coordinator: plan shared mandi vehicles, see who comes with how much, edit, and move the trip along. */
export function AdminMandiTrips() {
  const { data, errorCode, reload } = useLoad(fetchAdminTrips, []);
  const [creating, setCreating] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {creating ? (
        <TripEditor onDone={() => { setCreating(false); reload(); }} onCancel={() => setCreating(false)} />
      ) : (
        <Button variant="accent" icon={LuPlus} onClick={() => setCreating(true)}>
          {text().create}
        </Button>
      )}
      <LoadState data={data} errorCode={errorCode} reload={reload}>
        {(trips) =>
          trips.length === 0 ? (
            <EmptyState icon={LuTruck} message={hi.mandiTrips.empty} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {trips.map((trip) => (
                <TripPanel key={trip.id} trip={trip} onChanged={reload} />
              ))}
            </div>
          )
        }
      </LoadState>
    </div>
  );
}

function TripPanel({ trip, onChanged }: { trip: MandiTrip; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const step = async (status: MandiTrip['status']) => {
    setBusy(true);
    try {
      await setTripStatus(trip.id, status);
      notifySuccess(hi.mandiTrips.status[status]);
      onChanged();
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };
  if (editing) return <TripEditor trip={trip} onDone={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />;
  const tone = trip.status === 'cancelled' ? 'danger' : trip.status === 'open' ? 'success' : 'warning';
  return (
    <article className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-lg font-bold">
          {trip.mandi} · {shortDate(trip.date)}
        </h3>
        <Badge tone={tone} label={hi.mandiTrips.status[trip.status]} />
      </div>
      <p className="text-base">
        {trip.pickupPoint} ({trip.tehsil}) · {trip.vehicle}
      </p>
      <p className="text-base font-bold">
        {trip.bookedQuintal} / {trip.capacityQuintal} {hi.mandiTrips.quintal} · {trip.members} {hi.mandiTrips.members}
      </p>
      {trip.memberList && trip.memberList.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-2xl bg-surface-page p-2 text-base">
          {trip.memberList.map((member) => (
            <li key={member.phone} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {member.name}: {cropLabels[member.crop].hindi} {member.quantityQuintal} {hi.mandiTrips.quintal}
              </span>
              <a href={`tel:+91${member.phone}`} className="inline-flex min-h-11 items-center gap-1 font-bold text-primary-700">
                <LuPhone aria-hidden="true" className="size-4" />
                {member.phone}
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        {(trip.status === 'open' || trip.status === 'closed') && (
          <Button variant="secondary" size="md" icon={LuPencil} onClick={() => setEditing(true)}>
            {text().edit}
          </Button>
        )}
        {TRIP_NEXT[trip.status].map((next) => (
          <Button key={next} variant={next === 'cancelled' ? 'danger' : 'primary'} size="md" disabled={busy} onClick={() => void step(next)}>
            {text().to[next]}
          </Button>
        ))}
      </div>
    </article>
  );
}

function TripEditor({ trip, onDone, onCancel }: { trip?: MandiTrip; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<TripForm>(() =>
    trip
      ? {
          mandi: trip.mandi,
          date: trip.date,
          tehsil: trip.tehsil,
          pickupPoint: trip.pickupPoint,
          vehicle: trip.vehicle,
          capacity: String(trip.capacityQuintal),
          cost: paiseToRupeesInput(trip.costPerQuintalPaise ?? null),
          note: trip.note ?? '',
        }
      : EMPTY_TRIP_FORM,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (change: Partial<TripForm>) => setForm((current) => ({ ...current, ...change }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validateTripForm(form, trip?.bookedQuintal ?? 0);
    setError(result.error);
    if (!result.trip) return;
    setBusy(true);
    try {
      if (trip) await updateTrip(trip.id, result.trip);
      else await createTrip(result.trip);
      notifySuccess(text().saved);
      onDone();
    } catch (failure) {
      notifyError(failure instanceof ApiError ? failure.code : 'UNKNOWN');
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-3 rounded-3xl border-2 border-primary-200 bg-surface p-4" onSubmit={(event) => void submit(event)} noValidate>
      <h3 className="text-lg font-bold">{trip ? text().edit : text().create}</h3>
      <TextField label={text().mandi} value={form.mandi} maxLength={60} onChange={(e) => set({ mandi: e.target.value })} />
      <TextField label={text().date} type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
      <TextField label={text().tehsil} value={form.tehsil} maxLength={60} onChange={(e) => set({ tehsil: e.target.value })} />
      <TextField label={text().pickup} value={form.pickupPoint} maxLength={120} onChange={(e) => set({ pickupPoint: e.target.value })} />
      <TextField label={text().vehicle} value={form.vehicle} maxLength={80} onChange={(e) => set({ vehicle: e.target.value })} />
      <TextField label={text().capacity} inputMode="numeric" value={form.capacity} onChange={(e) => set({ capacity: e.target.value.replace(/\D/g, '') })} />
      <TextField label={text().cost} inputMode="decimal" prefix="₹" value={form.cost} onChange={(e) => set({ cost: e.target.value.replace(/[^\d.]/g, '') })} />
      <TextField label={text().note} value={form.note} maxLength={300} onChange={(e) => set({ note: e.target.value })} />
      {error && <p className="font-bold text-danger-700">{error}</p>}
      {trip && trip.members > 0 && <p className="text-base text-ink-500">{text().membersTold}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" variant="accent" size="md" disabled={busy}>
          {hi.save}
        </Button>
        <Button variant="ghost" size="md" icon={LuX} onClick={onCancel}>
          {hi.sell.actions.cancel}
        </Button>
      </div>
    </form>
  );
}
