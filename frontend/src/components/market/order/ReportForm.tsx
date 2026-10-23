import { useState } from 'react';
import { LuFlag, LuSend } from 'react-icons/lu';
import { ApiError } from '../../../api/client';
import type { ReportReason } from '../../../api/marketTypes';
import { reportProblem } from '../../../api/orders';
import type { OrdersText } from '../../../strings/en';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { TextField } from '../../ui/TextField';
import { notifyError, notifySuccess } from '../../ui/notify';

const ORDER_REASONS: ReportReason[] = ['quality', 'not_delivered', 'wrong_item', 'payment', 'behaviour', 'other'];
const LISTING_REASONS: ReportReason[] = ['fake_listing', 'quality', 'other'];

/** "समस्या बताएँ" for an order or a listing. Goes to the coordinators. */
export function ReportForm({ target, text }: { target: { orderId: string } | { listingId: string }; text: OrdersText }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const reasons = 'orderId' in target ? ORDER_REASONS : LISTING_REASONS;

  const send = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await reportProblem({ ...target, reason, ...(details.trim() && { text: details.trim() }) });
      notifySuccess(text.reportSent);
      setSent(true);
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };

  if (sent) return <p className="text-center font-bold text-success-700">{text.reportSent}</p>;
  if (!open) {
    return (
      <Button variant="ghost" size="md" icon={LuFlag} onClick={() => setOpen(true)}>
        {text.report}
      </Button>
    );
  }
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4" aria-label={text.reportTitle}>
      <h3 className="text-xl font-bold">{text.reportTitle}</h3>
      <div className="flex flex-wrap gap-2">
        {reasons.map((option) => (
          <Chip key={option} label={text.reasons[option]} selected={reason === option} onClick={() => setReason(option)} />
        ))}
      </div>
      <TextField label={text.reportText} value={details} maxLength={500} onChange={(e) => setDetails(e.target.value)} />
      <Button variant="accent" icon={LuSend} disabled={!reason || busy} onClick={() => void send()}>
        {text.reportSend}
      </Button>
    </section>
  );
}
