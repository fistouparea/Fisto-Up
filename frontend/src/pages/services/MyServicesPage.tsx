import { LuCalendarDays, LuClipboardList } from 'react-icons/lu';
import { fetchBookings, fetchMyServices, type Booking } from '../../api/services';
import { ServiceCard } from '../../components/services/ServiceCard';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { SERVICE_KIND_INFO } from '../../data/serviceKinds';
import { routes } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { hi } from '../../strings/hi';
import { shortDate } from '../../utils/dayLabel';

/** "मेरी लिस्टिंग और बुकिंग": what I offer (with approval state) and every booking I asked for or got. */
export function MyServicesPage() {
  const listings = useLoad(fetchMyServices, []);
  const bookings = useLoad(fetchBookings, []);
  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.services.mine} icon={LuClipboardList} />
      <h3 className="text-xl font-bold">{hi.services.myBookings}</h3>
      {bookings.data === undefined ? (
        <Skeleton className="h-24" />
      ) : bookings.data.length === 0 ? (
        <EmptyState icon={LuCalendarDays} message={hi.services.noBookings} />
      ) : (
        <ul className="flex flex-col gap-2">
          {bookings.data.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </ul>
      )}
      <h3 className="text-xl font-bold">{hi.services.myListings}</h3>
      {listings.data === undefined ? (
        <Skeleton className="h-24" />
      ) : listings.data.length === 0 ? (
        <EmptyState icon={LuClipboardList} message={hi.services.noListings} />
      ) : (
        <div className="flex flex-col gap-3">
          {listings.data.map((listing) => (
            <ServiceCard key={listing.id} listing={listing} showStatus />
          ))}
        </div>
      )}
    </section>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const Icon = SERVICE_KIND_INFO[booking.kind].icon;
  const needsMe = booking.allowedNext.includes('accepted');
  return (
    <li>
      <a href={routes.serviceBooking(booking.id)} className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card">
        <Icon aria-hidden="true" className="size-8 shrink-0 text-primary-700" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{booking.title}</span>
          <span className="block text-sm text-ink-500">
            {booking.viewerRole === 'owner' ? booking.requester.name : booking.owner.name}
            {booking.dates[0] && ` · ${shortDate(booking.dates[0])}${booking.dates.length > 1 ? ` +${booking.dates.length - 1}` : ''}`}
          </span>
        </span>
        <Badge tone={needsMe ? 'warning' : booking.status === 'accepted' || booking.status === 'completed' ? 'success' : 'neutral'} label={hi.services.bookingStatus[booking.status]} />
      </a>
    </li>
  );
}
