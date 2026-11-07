import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { LuBanknote, LuQrCode } from 'react-icons/lu';
import type { Order } from '../../../api/marketTypes';
import type { OrdersText } from '../../../strings/en';
import { formatRupees } from '../../../utils/money';
import { Card } from '../../ui/Card';

/** UPI deep link (opens the phone's UPI app) + QR for paying from another phone. Cash orders just say "pay cash". */
export function UpiPayCard({ order, text }: { order: Order; text: OrdersText }) {
  const payment = order.payment;
  const [qr, setQr] = useState<string | null>(null);

  const upiLink = order.paymentMethod === 'upi' ? payment?.upiLink : undefined;
  useEffect(() => {
    if (!upiLink) return;
    let cancelled = false;
    QRCode.toDataURL(upiLink, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [upiLink]);

  if (!payment) return null;
  const amount = formatRupees(payment.amountPaise);

  // Cash at delivery, also when the seller has no UPI ID (then there is never a UPI link or QR).
  if (order.paymentMethod === 'cash' || !upiLink) {
    return (
      <Card icon={LuBanknote} title={text.payTitle} speakText={`${text.cashNote} ${amount}`}>
        <p className="text-2xl font-bold">{amount}</p>
        <p>{text.cashNote}</p>
      </Card>
    );
  }

  return (
    <Card icon={LuQrCode} title={text.payTitle} speakText={`${text.payTitle}: ${amount}. ${text.payNote}`}>
      <div className="flex flex-col items-center gap-3">
        <p className="text-3xl font-bold text-primary-700">{amount}</p>
        <a
          href={upiLink}
          className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-accent-400 px-6 text-xl font-bold text-ink-900 shadow-raised"
        >
          <LuQrCode aria-hidden="true" className="size-7" />
          {text.payWithUpi}
        </a>
        {qr && (
          <>
            <p className="text-base text-ink-500">{text.scanQr}</p>
            <img src={qr} alt={`UPI QR ${payment.upiId ?? ''}`} width={240} height={240} className="rounded-2xl border border-line bg-white p-2" />
          </>
        )}
        <p className="text-base">
          UPI ID: <strong className="select-all">{payment.upiId}</strong> · {payment.payeeName}
        </p>
        <p className="text-base text-ink-500">{text.payNote}</p>
      </div>
    </Card>
  );
}
