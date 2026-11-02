import { useState } from 'react';
import { LuCamera, LuCircleCheckBig, LuMapPin, LuPackageCheck, LuTruck } from 'react-icons/lu';
import { ApiError } from '../api/client';
import { fetchDelivery, reportDeliveryStep, type DeliveryStep } from '../api/delivery';
import { PhotoActions } from '../components/PhotoActions';
import { PhotoPreview } from '../components/PhotoPreview';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { notifyError, notifySuccess } from '../components/ui/notify';
import { useLoad } from '../hooks/useLoad';
import { hi } from '../strings/hi';
import { compressImage } from '../utils/compressImage';

const STEP_ICONS: Record<DeliveryStep, typeof LuTruck> = { picked: LuPackageCheck, on_the_way: LuTruck, delivered: LuCircleCheckBig };

/** The delivery person's page (no login): one big button for the next step, an optional photo as proof. */
export function DeliveryPage({ token }: { token: string }) {
  const { data, errorCode, reload } = useLoad(() => fetchDelivery(token), [token]);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);

  if (finished) return <EmptyState icon={LuCircleCheckBig} tone="success" message={hi.delivery.thanks} />;
  if (errorCode) return <EmptyState icon={LuTruck} tone="warning" message={errorCode === 'NOT_FOUND' ? hi.delivery.linkInvalid : hi.delivery.loadFailed} />;
  if (!data) return <Skeleton className="h-64" />;

  const send = async (step: DeliveryStep) => {
    setBusy(true);
    try {
      const next = await reportDeliveryStep(token, step, photo);
      notifySuccess(hi.delivery.steps[step]);
      setPhoto(null);
      if (next.next === null) setFinished(true);
      else reload();
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };
  const next = data.next;
  const NextIcon = next ? STEP_ICONS[next] : LuCircleCheckBig;
  const speak = `${hi.delivery.title}. ${data.item}, ${data.quantity}. ${data.buyerName}, ${data.address}.`;

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.delivery.title} icon={LuTruck} speakText={speak} />
      <Card>
        <p className="text-sm text-ink-500">
          {hi.delivery.order}: <strong className="tracking-wider">{data.ref}</strong>
        </p>
        <p className="text-2xl font-bold" data-read-aloud>
          {data.item} · {data.quantity}
        </p>
        <p className="mt-2 flex items-start gap-2 text-lg">
          <LuMapPin aria-hidden="true" className="mt-1 size-6 shrink-0 text-primary-700" />
          <span>
            <strong>{data.buyerName}</strong>
            <br />
            {data.address}
          </span>
        </p>
      </Card>
      <ol className="flex flex-col gap-1 text-lg" aria-label={hi.delivery.timeline}>
        {data.done.map((step) => (
          <li key={step} className="flex items-center gap-2 text-success-800">
            <LuCircleCheckBig aria-hidden="true" className="size-6" /> {hi.delivery.steps[step]}
          </li>
        ))}
      </ol>
      {next && (
        <>
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-lg font-bold">
              <LuCamera aria-hidden="true" className="size-6 text-primary-700" />
              {hi.delivery.photoOptional}
            </p>
            {photo ? <PhotoPreview photo={photo} size="small" /> : <div className="flex gap-3"><PhotoActions onPick={(file) => void compressImage(file).then(setPhoto, () => notifyError('PHOTO_READ_FAILED'))} /></div>}
          </div>
          <Button variant="accent" size="hero" icon={NextIcon} disabled={busy} onClick={() => void send(next)}>
            {hi.delivery.buttons[next]}
          </Button>
        </>
      )}
    </section>
  );
}
