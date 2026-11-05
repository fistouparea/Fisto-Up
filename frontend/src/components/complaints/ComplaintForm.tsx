import { useState } from 'react';
import { LuFlag, LuSend } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { raiseComplaint, uploadComplaintPhoto, type ComplaintTargetKind } from '../../api/complaints';
import type { ReportReason } from '../../api/marketTypes';
import { routes } from '../../hooks/useHashRoute';
import { hi } from '../../strings/hi';
import { hiF } from '../../strings/hiFeatures';
import { compressImage } from '../../utils/compressImage';
import { navigateTo } from '../../utils/navigate';
import { PhotoActions } from '../PhotoActions';
import { PhotoPreview } from '../PhotoPreview';
import { VoiceTextBox } from '../VoiceTextBox';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { notifyError, notifySuccess } from '../ui/notify';

const REASONS: Record<ComplaintTargetKind, ReportReason[]> = {
  order: ['quality', 'not_delivered', 'wrong_item', 'payment', 'behaviour', 'other'],
  booking: ['not_delivered', 'quality', 'payment', 'behaviour', 'other'],
  listing: ['fake_listing', 'quality', 'other'],
  serviceListing: ['fake_listing', 'behaviour', 'other'],
};

/** One complaint form for orders, bookings and listings: what kind, speak or type, optional photo. */
export function ComplaintForm({ target }: { target: { kind: ComplaintTargetKind; id: string } }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportReason | null>(null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  if (!open) {
    return (
      <Button variant="ghost" size="md" icon={LuFlag} onClick={() => setOpen(true)}>
        {hiF.complaints.raise}
      </Button>
    );
  }
  const send = async () => {
    setShowErrors(true);
    if (!category || text.trim().length < 3) return;
    setBusy(true);
    try {
      const photoId = photo ? await uploadComplaintPhoto(photo) : undefined;
      const complaint = await raiseComplaint({ target, category, text: text.trim(), ...(photoId && { photoId }) });
      notifySuccess(hiF.complaints.sent);
      navigateTo(routes.complaint(complaint.id));
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
      setBusy(false);
    }
  };
  return (
    <section className="flex flex-col gap-3 rounded-3xl border-2 border-danger-200 bg-surface p-4" aria-label={hiF.complaints.raise}>
      <h3 className="text-xl font-bold">{hi.orders.reportTitle}</h3>
      <div className="flex flex-wrap gap-2">
        {REASONS[target.kind].map((reason) => (
          <Chip key={reason} label={hi.orders.reasons[reason]} selected={category === reason} onClick={() => setCategory(reason)} />
        ))}
      </div>
      {showErrors && !category && <p className="font-bold text-danger-700">{hi.orders.reportTitle}</p>}
      <VoiceTextBox id={`complaint-${target.id}`} label={hiF.complaints.describe} value={text} onChange={setText} maxLength={1000} />
      {showErrors && text.trim().length < 3 && <p className="font-bold text-danger-700">{hi.help.messageShort}</p>}
      <p className="text-lg font-bold">{hiF.complaints.photo}</p>
      {photo ? <PhotoPreview photo={photo} size="small" /> : <div className="flex gap-3"><PhotoActions onPick={(file) => void compressImage(file).then(setPhoto, () => notifyError('PHOTO_READ_FAILED'))} /></div>}
      <Button variant="danger" size="lg" icon={LuSend} disabled={busy} onClick={() => void send()}>
        {hi.orders.reportSend}
      </Button>
    </section>
  );
}
