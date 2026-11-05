import { useState } from 'react';
import { LuCopy, LuLink, LuShare2 } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { createDeliveryLink, deliveryLinkUrl } from '../../api/delivery';
import type { Order } from '../../api/marketTypes';
import { hiF } from '../../strings/hiFeatures';
import { Button } from '../ui/Button';
import { notifyError, notifySuccess } from '../ui/notify';

/** Coordinator: make the delivery person's link and send it by WhatsApp (shown once; a new one replaces it). */
export function DeliveryLinkButton({ order }: { order: Order }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!order.deliveryPerson) return null;

  const make = async () => {
    setBusy(true);
    try {
      setUrl(deliveryLinkUrl((await createDeliveryLink(order.id)).token));
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };
  const message = url ? `${hiF.delivery.shareText} ${order.ref}: ${url}` : '';
  return (
    <div className="flex flex-col gap-2 px-2 pb-2">
      <Button variant="secondary" size="md" icon={LuLink} disabled={busy} onClick={() => void make()}>
        {order.deliveryLinkActive || url ? hiF.delivery.newLink : hiF.delivery.makeLink}
      </Button>
      {url && (
        <>
          <p className="break-all rounded-2xl bg-surface p-2 text-sm">{url}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="md"
              icon={LuCopy}
              onClick={() => void navigator.clipboard.writeText(url).then(() => notifySuccess(hiF.delivery.copied), () => notifyError('UNKNOWN'))}
            >
              {hiF.delivery.copy}
            </Button>
            <a
              href={`https://wa.me/91${order.deliveryPerson?.phone ?? ''}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary-700 px-4 text-lg font-bold text-white"
            >
              <LuShare2 aria-hidden="true" className="size-6" />
              WhatsApp
            </a>
          </div>
          <p className="text-sm text-ink-500">{hiF.delivery.linkNote}</p>
        </>
      )}
    </div>
  );
}
