import { ComplaintForm } from '../../components/complaints/ComplaintForm';
import { useFlags } from '../../hooks/useFlags';
import { useState } from 'react';
import { LuArrowLeft, LuCalendarDays, LuCircleCheckBig, LuCircleX, LuPhone, LuX } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { fetchBooking, rateBooking, stepBooking, type Booking, type BookingStatus } from '../../api/services';
import { StarPicker } from '../../components/services/StarPicker';
import { Badge } from '../../components/ui/Badge';
import { Button, type ButtonVariant } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { notifyError, notifySuccess } from '../../components/ui/notify';
import { PRICE_UNIT_LABELS, SERVICE_KIND_INFO } from '../../data/serviceKinds';
import { useLoad } from '../../hooks/useLoad';
import { hi, marketErrorMessage } from '../../strings/hi';
import { hiF } from '../../strings/hiFeatures';
import { dayLabel, shortDate } from '../../utils/dayLabel';
import { formatRupees } from '../../utils/money';

const STEP_STYLE: Record<BookingStatus, { variant: ButtonVariant; icon: typeof LuCircleCheckBig }> = {
  accepted: { variant: 'accent', icon: LuCircleCheckBig },
  completed: { variant: 'primary', icon: LuCircleCheckBig },
  rejected: { variant: 'danger', icon: LuCircleX },
  cancelled: { variant: 'ghost', icon: LuX },
  requested: { variant: 'ghost', icon: LuX },
};

/** One booking: big "हाँ" / "ना" buttons for the owner, phone numbers after both said yes, then stars. */
export function BookingPage({ id }: { id: string }) {
  const { data, errorCode, reload } = useLoad(() => fetchBooking(id), [id]);
  if (errorCode) {
    return (
      <EmptyState icon={LuCalendarDays} tone="warning" message={marketErrorMessage(errorCode)}>
        <Button variant="secondary" icon={LuArrowLeft} onClick={() => window.history.back()}>
          {hi.back}
        </Button>
      </EmptyState>
    );
  }
  if (!data) return <Skeleton className="h-64" />;
  return <BookingView booking={data} onChanged={reload} />;
}

function BookingView({ booking, onChanged }: { booking: Booking; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const { complaints } = useFlags();
  const phone = booking.contact?.ownerPhone ?? booking.contact?.requesterPhone;
  const act = async (action: () => Promise<Booking>, done: string) => {
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
  const tone = booking.status === 'accepted' || booking.status === 'completed' ? 'success' : booking.status === 'requested' ? 'warning' : 'danger';
  const status = hiF.services.bookingStatus[booking.status];
  const speak = `${booking.title}। ${status}। ${booking.dates.map((day) => shortDate(day)).join(', ')}`;
  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hiF.services.bookingTitle} icon={SERVICE_KIND_INFO[booking.kind].icon} speakText={speak} onBack={() => window.history.back()} backLabel={hi.back} />
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 text-xl font-bold">{booking.title}</h3>
          <Badge tone={tone} label={status} size="lg" />
        </div>
        <p className="mt-2 text-lg" data-read-aloud>
          {formatRupees(booking.pricePaise)} / {PRICE_UNIT_LABELS[booking.priceUnit]}
        </p>
        {booking.dates.length > 0 && (
          <p className="mt-1 text-base">
            {booking.dates.map((day) => `${dayLabel(day)} ${shortDate(day)}`).join(' · ')}
          </p>
        )}
        <p className="mt-1 text-base text-ink-700">
          {hiF.services.from}: {booking.requester.name} · {hiF.services.to}: {booking.owner.name}
        </p>
        {booking.note && <p className="mt-2 rounded-2xl bg-surface-page p-3">{booking.note}</p>}
      </Card>

      {phone ? (
        <a href={`tel:+91${phone}`} className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-primary-700 px-4 text-xl font-bold text-white">
          <LuPhone aria-hidden="true" className="size-7" />
          {hiF.services.call}: {phone}
        </a>
      ) : (
        booking.status === 'requested' && <p className="text-base text-ink-500">{hiF.services.contactAfter}</p>
      )}

      {booking.allowedNext.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {booking.allowedNext.map((to) => (
            <Button key={to} variant={STEP_STYLE[to].variant} size={to === 'accepted' || to === 'rejected' ? 'hero' : 'lg'} icon={STEP_STYLE[to].icon} disabled={busy} onClick={() => void act(() => stepBooking(booking.id, to), hiF.services.bookingStatus[to])}>
              {hiF.services.steps[to as keyof typeof hiF.services.steps]}
            </Button>
          ))}
        </div>
      )}

      {booking.canRate && (
        <Card title={hiF.services.rate}>
          <StarPicker label={hiF.services.rate} disabled={busy} onPick={(stars) => void act(() => rateBooking(booking.id, stars), hiF.services.rated)} />
        </Card>
      )}
      {complaints && booking.viewerRole !== 'coordinator' && <ComplaintForm target={{ kind: 'booking', id: booking.id }} />}
      <p className="text-base text-ink-500">{hiF.services.noPayment}</p>
    </section>
  );
}
