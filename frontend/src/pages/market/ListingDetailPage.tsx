import type { ReactNode } from 'react';
import { LuArrowLeft, LuInfo, LuMapPin, LuPhoneOff, LuRefreshCw, LuSearchX, LuShare2, LuUsers } from 'react-icons/lu';
import { LangToggle } from '../../components/market/LangToggle';
import { PhotoGallery } from '../../components/market/PhotoGallery';
import { RatingLine, VerifiedBadge } from '../../components/market/SellerBadges';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { SpeakButton } from '../../components/ui/SpeakButton';
import { routes } from '../../hooks/useHashRoute';
import { useLang } from '../../hooks/useLang';
import { useListing } from '../../hooks/useListing';
import { unitLabels } from '../../strings/hi';
import { formatRupees } from '../../utils/money';
import { navigateTo } from '../../utils/navigate';
import { listingLink, whatsappShareUrl } from '../../utils/share';

interface ListingDetailPageProps {
  id: string;
  /** The order / price request buttons (Task 5); shown under the price. */
  actions?: (listing: NonNullable<ReturnType<typeof useListing>['listing']>) => ReactNode;
}

export function ListingDetailPage({ id, actions }: ListingDetailPageProps) {
  const { lang, t } = useLang();
  const { listing, loading, errorCode, retry } = useListing(id);
  const back = (
    <Button variant="ghost" size="md" fullWidth={false} icon={LuArrowLeft} onClick={() => navigateTo(routes.market)}>
      {t.back}
    </Button>
  );

  if (loading && !listing) return <Skeleton className="h-96" />;
  if (!listing) {
    const missing = errorCode === 'NOT_FOUND';
    return (
      <section className="flex flex-col gap-4">
        {back}
        <EmptyState icon={missing ? LuSearchX : LuRefreshCw} tone={missing ? 'neutral' : 'warning'} message={missing ? t.notFound : t.loadFailed}>
          {!missing && (
            <Button variant="accent" icon={LuRefreshCw} onClick={retry}>
              {t.retry}
            </Button>
          )}
        </EmptyState>
      </section>
    );
  }

  const title = listing.title[lang] || listing.title.hi;
  const description = listing.description[lang] || listing.description.hi;
  const unit = unitLabels[listing.unit][lang];
  const price = `${formatRupees(listing.pricePerUnitPaise)} ${t.per} ${unit}`;
  const place = [listing.seller.village, listing.place.tehsil, listing.place.district].filter(Boolean).join(', ');
  const shareText = `${title} – ${price}. ${t.shareIntro}: ${listingLink(window.location.origin, listing.id)}`;

  return (
    <article className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-6" lang={lang}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          {back}
          <LangToggle />
        </div>
        <PhotoGallery urls={listing.photoUrls} product={listing.product} label={t.photoOf} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-2xl font-bold leading-tight">{title}</h2>
          <SpeakButton text={`${listing.title.hi}। ${formatRupees(listing.pricePerUnitPaise)} ${unitLabels[listing.unit].hi}`} />
        </div>
        <p className="text-3xl font-bold text-primary-700">
          {formatRupees(listing.pricePerUnitPaise)}
          <span className="text-lg font-normal text-ink-500"> / {unit}</span>
        </p>
        <dl className="grid grid-cols-2 gap-2 text-base">
          <Fact label={t.available} value={`${listing.quantityAvailable} ${unit}`} />
          <Fact label={t.minOrder} value={`${listing.minOrderQty} ${unit}`} />
        </dl>

        {actions?.(listing)}
        <Callout tone="neutral" icon={LuInfo} text={t.payDirect} />

        {(listing.qualityNotes || description) && (
          <section className="rounded-3xl border border-line bg-surface p-4">
            {description && (
              <>
                <h3 className="text-lg font-bold">{t.about}</h3>
                <p className="mb-2">{description}</p>
              </>
            )}
            {listing.qualityNotes && (
              <>
                <h3 className="text-lg font-bold">{t.quality}</h3>
                <p>{listing.qualityNotes}</p>
              </>
            )}
            {listing.fssaiNumber && (
              <p className="mt-2 text-base text-ink-700">
                {t.fssai}: {listing.fssaiNumber}
              </p>
            )}
          </section>
        )}

        <section className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4">
          <h3 className="text-lg font-bold">{t.seller}</h3>
          <p className="flex flex-wrap items-center gap-2 text-xl font-bold">
            {listing.seller.name}
            {listing.seller.verified && <VerifiedBadge />}
          </p>
          <RatingLine rating={listing.seller.rating} />
          {listing.seller.shgName && (
            <p className="flex items-center gap-2">
              <LuUsers aria-hidden="true" className="size-5 text-ink-500" />
              {t.group}: {listing.seller.shgName}
            </p>
          )}
          <p className="flex items-center gap-2">
            <LuMapPin aria-hidden="true" className="size-5 text-ink-500" />
            {place}
          </p>
          <p className="flex items-center gap-2 text-base text-ink-500">
            <LuPhoneOff aria-hidden="true" className="size-5" />
            {t.phoneHidden}
          </p>
        </section>

        <a
          href={whatsappShareUrl(shareText)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-success-600 bg-surface px-5 text-lg font-bold text-success-700 hover:bg-success-50"
        >
          <LuShare2 aria-hidden="true" className="size-6" />
          {t.share}
        </a>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-green p-3">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}
