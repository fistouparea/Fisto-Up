import { ComplaintForm } from '../../components/complaints/ComplaintForm';
import { useFlags } from '../../hooks/useFlags';
import { useState } from 'react';
import { LuArrowLeft, LuCalendarDays, LuLogIn, LuMapPin, LuPause, LuPlay, LuScale, LuSend, LuUsers } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { fetchMatches, fetchService, requestBooking, updateService, type ServiceListing } from '../../api/services';
import { VoiceTextBox } from '../../components/VoiceTextBox';
import { DayPicker } from '../../components/services/DayPicker';
import { ServiceCard } from '../../components/services/ServiceCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { notifyError, notifySuccess } from '../../components/ui/notify';
import { LIVESTOCK_PURPOSES, PRICE_UNIT_LABELS, SERVICE_KIND_INFO, typeLabel } from '../../data/serviceKinds';
import { useAuth } from '../../hooks/useAuth';
import { routes } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { hi, marketErrorMessage } from '../../strings/hi';
import { addDays, todayInIndia } from '../../utils/indiaDate';
import { goToLogin } from '../../utils/loginRedirect';
import { formatRupees } from '../../utils/money';
import { navigateTo } from '../../utils/navigate';

/** One listing: details, free days and "बुकिंग माँगें"; for its owner the calendar, pause and (labour) matches. */
export function ServiceDetailPage({ id }: { id: string }) {
  const { data, errorCode, reload } = useLoad(() => fetchService(id), [id]);
  const { user } = useAuth();
  const { complaints } = useFlags();
  if (errorCode) {
    return (
      <EmptyState icon={LuMapPin} tone="warning" message={marketErrorMessage(errorCode)}>
        <Button variant="secondary" icon={LuArrowLeft} onClick={() => window.history.back()}>
          {hi.back}
        </Button>
      </EmptyState>
    );
  }
  if (!data) return <Skeleton className="h-64" />;
  const isOwner = Boolean(user && (user.id === data.owner.id || user.role === 'coordinator') && data.status);
  return (
    <section className="flex flex-col gap-4">
      <ListingFacts listing={data} />
      {isOwner ? <OwnerTools listing={data} onChanged={reload} /> : <BookingForm listing={data} loggedIn={Boolean(user)} />}
      {complaints && user && !isOwner && <ComplaintForm target={{ kind: 'serviceListing', id: data.id }} />}
    </section>
  );
}

function ListingFacts({ listing }: { listing: ServiceListing }) {
  const details = listing.details;
  const facts: [string, string][] = [];
  if (listing.kind === 'equipment') facts.push([hi.services.type, details.withOperator === false ? hi.services.equipment.noOperator : hi.services.equipment.withOperator]);
  if (listing.kind === 'labour') {
    facts.push([hi.services.skills, listing.skills.map((skill) => typeLabel('labour', skill)).join(', ')]);
    if (typeof details.workersNeeded === 'number') facts.push([hi.services.labour.workersNeeded, String(details.workersNeeded)]);
  }
  if (listing.kind === 'livestock') {
    facts.push([hi.services.livestock.breed, String(details.breed ?? '—')], [hi.services.livestock.age, String(details.ageYears ?? '—')]);
    if (typeof details.milkLitresPerDay === 'number') facts.push([hi.services.livestock.milk, String(details.milkLitresPerDay)]);
    if (typeof details.vaccinations === 'string' && details.vaccinations) facts.push([hi.services.livestock.vaccination, details.vaccinations]);
    const purpose = LIVESTOCK_PURPOSES[details.purpose as keyof typeof LIVESTOCK_PURPOSES] as string | undefined;
    if (purpose) facts.push([hi.services.livestock.purpose, purpose]);
    facts.push([hi.services.livestock.count, String(details.count ?? 1)]);
  }
  const price = `${formatRupees(listing.pricePaise)} / ${PRICE_UNIT_LABELS[listing.priceUnit]}`;
  const speak = [listing.title, typeLabel(listing.kind, listing.typeId), price, listing.description, ...facts.map(([label, value]) => `${label}: ${value}`)].join('। ');
  return (
    <>
      {/* Back + title + 🔊 only: with the kind icon too, long titles wrapped to four lines at 360 px. */}
      <PageHeader title={listing.title} speakText={speak} onBack={() => window.history.back()} backLabel={hi.back} />
      {listing.photoUrls.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {listing.photoUrls.map((url) => (
            <img key={url} src={url} alt="" className="h-56 w-auto max-w-[85%] shrink-0 rounded-3xl object-cover" />
          ))}
        </div>
      )}
      {listing.kind === 'livestock' && <Callout tone="warning" icon={LuScale} text={hi.services.livestock.legal} />}
      <Card>
        <p className="text-sm font-bold text-primary-700">{typeLabel(listing.kind, listing.typeId)}</p>
        <p className="text-2xl font-bold">{price}</p>
        <p className="mt-1 flex items-center gap-1 text-base text-ink-700" data-read-aloud>
          <LuMapPin aria-hidden="true" className="size-5" />
          {listing.owner.name}, {listing.village}
          {listing.distanceKm !== undefined && ` · ${listing.distanceKm} ${hi.services.kmAway}`}
        </p>
        {listing.description && <p className="mt-2">{listing.description}</p>}
        {facts.length > 0 && (
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
            {facts.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-500">{label}</dt>
                <dd className="font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-3 text-base text-ink-500">{hi.services.noPayment}</p>
      </Card>
    </>
  );
}

function BookingForm({ listing, loggedIn }: { listing: ServiceListing; loggedIn: boolean }) {
  const calendar = SERVICE_KIND_INFO[listing.kind].bookedByDate;
  const [dates, setDates] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!loggedIn) {
    return (
      <Button variant="accent" size="lg" icon={LuLogIn} onClick={() => goToLogin()}>
        {hi.services.loginToBook}
      </Button>
    );
  }
  const send = async () => {
    setBusy(true);
    try {
      const booking = await requestBooking(listing.id, { dates, ...(note.trim() && { note: note.trim() }) });
      notifySuccess(hi.services.requested);
      navigateTo(routes.serviceBooking(booking.id));
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
      setBusy(false);
    }
  };
  return (
    <Card icon={LuCalendarDays} title={calendar ? hi.services.pickDays : hi.services.enquire}>
      {calendar &&
        (listing.freeDates.length === 0 ? (
          <p>{hi.services.noFreeDays}</p>
        ) : (
          <DayPicker days={listing.freeDates} selected={dates} onChange={setDates} label={hi.services.pickDays} />
        ))}
      <div className="mt-3">
        <VoiceTextBox id="booking-note" label={hi.services.note} value={note} onChange={setNote} maxLength={300} />
      </div>
      <p className="mt-2 text-base text-ink-500">{hi.services.contactAfter}</p>
      <Button variant="accent" size="lg" icon={LuSend} className="mt-3" disabled={busy || (calendar && dates.length === 0)} onClick={() => void send()}>
        {calendar ? hi.services.request : hi.services.enquire}
      </Button>
    </Card>
  );
}

function OwnerTools({ listing, onChanged }: { listing: ServiceListing; onChanged: () => void }) {
  const calendar = SERVICE_KIND_INFO[listing.kind].bookedByDate;
  const today = todayInIndia();
  const booked = listing.bookedDates ?? [];
  const [dates, setDates] = useState<string[]>(() => [...listing.freeDates, ...booked].sort());
  const [busy, setBusy] = useState(false);
  const act = async (change: Parameters<typeof updateService>[1]) => {
    setBusy(true);
    try {
      await updateService(listing.id, change);
      notifySuccess(hi.services.saved);
      onChanged();
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };
  const status = listing.status ?? 'active';
  return (
    <>
      <Callout tone={status === 'active' ? 'success' : status === 'rejected' ? 'danger' : 'warning'} icon={SERVICE_KIND_INFO[listing.kind].icon} text={`${hi.services.ownListing} ${hi.services.status[status]}${listing.rejectReason ? `: ${listing.rejectReason}` : ''}`} />
      {status === 'pending_approval' && <p className="text-base text-ink-700">{hi.services.pendingApproval}</p>}
      {(status === 'active' || status === 'paused') && (
        <Button variant="secondary" size="md" icon={status === 'active' ? LuPause : LuPlay} disabled={busy} onClick={() => void act({ status: status === 'active' ? 'paused' : 'active' })}>
          {status === 'active' ? hi.services.pause : hi.services.resume}
        </Button>
      )}
      {calendar && (
        <Card icon={LuCalendarDays} title={hi.services.calendar}>
          <p className="mb-2 text-base text-ink-500">{hi.services.calendarHint}</p>
          <DayPicker days={Array.from({ length: 30 }, (_, index) => addDays(today, index))} selected={dates} disabled={booked} onChange={setDates} label={hi.services.calendar} />
          <Button variant="accent" size="md" className="mt-3" disabled={busy} onClick={() => void act({ availableDates: [...new Set([...dates, ...booked])].sort() })}>
            {hi.services.saveCalendar}
          </Button>
        </Card>
      )}
      {listing.kind === 'labour' && status === 'active' && <LabourMatches listingId={listing.id} />}
    </>
  );
}

function LabourMatches({ listingId }: { listingId: string }) {
  const { data } = useLoad(() => fetchMatches(listingId), [listingId]);
  return (
    <Card icon={LuUsers} title={hi.services.labour.matches}>
      <p className="mb-3 text-base text-ink-500">{hi.services.labour.matchesHint}</p>
      {data === undefined ? (
        <Skeleton className="h-24" />
      ) : data.length === 0 ? (
        <p>{hi.services.labour.noMatches}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((match) => (
            <div key={match.listing.id} className="flex flex-col gap-1">
              <ServiceCard listing={match.listing} />
              {match.sharedDates.length > 0 && <Badge tone="success" label={`${hi.services.labour.sharedDays}: ${match.sharedDates.length}`} />}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
