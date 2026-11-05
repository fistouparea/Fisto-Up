import { useState } from 'react';
import { LuClock, LuSend } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { sendComplaintMessage, slaHoursLeft, type Complaint } from '../../api/complaints';
import { hi } from '../../strings/hi';
import { hiF } from '../../strings/hiFeatures';
import { cn } from '../../utils/cn';
import { formatDate } from '../../utils/formatDate';
import { VoiceTextBox } from '../VoiceTextBox';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { notifyError } from '../ui/notify';

/** One complaint: facts, status with SLA time, photo, messages between both sides and the coordinator. */
export function ComplaintThread({ complaint, onChanged }: { complaint: Complaint; onChanged: (complaint: Complaint) => void }) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const closed = complaint.status === 'resolved' || complaint.status === 'rejected';
  const hours = slaHoursLeft(complaint);
  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      onChanged(await sendComplaintMessage(complaint.id, reply.trim()));
      setReply('');
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };
  const tone = complaint.status === 'resolved' ? 'success' : complaint.status === 'rejected' ? 'neutral' : complaint.overdue ? 'danger' : 'warning';
  const speak = [hi.orders.reasons[complaint.category], complaint.text, hiF.complaints.status[complaint.status], complaint.resolution].filter(Boolean).join('। ');
  return (
    <div className="flex flex-col gap-4">
      <Card title={complaint.target.title} speakText={speak}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={tone} label={hiF.complaints.status[complaint.status]} />
          <Badge tone="neutral" label={hi.orders.reasons[complaint.category]} />
        </div>
        {complaint.text && <p data-read-aloud>{complaint.text}</p>}
        <p className="mt-2 text-base text-ink-500">
          {hiF.complaints.from}: {complaint.reporter.name}
          {complaint.against && ` · ${hiF.complaints.against}: ${complaint.against.name}`}
        </p>
        {!closed && hours !== null && (
          <p className={cn('mt-2 flex items-center gap-2 font-bold', complaint.overdue ? 'text-danger-700' : 'text-ink-700')}>
            <LuClock aria-hidden="true" className="size-5" />
            {complaint.overdue ? hiF.complaints.overdue : `${hiF.complaints.slaLeft}: ${Math.max(hours, 0)} ${hiF.complaints.hours}`}
          </p>
        )}
        {complaint.photoUrl && <img src={complaint.photoUrl} alt={hiF.complaints.photo} className="mt-3 h-40 w-auto rounded-2xl object-cover" />}
        {complaint.resolution && (
          <p className="mt-3 rounded-2xl bg-surface-green p-3 font-bold">
            {hiF.complaints.resolution}: {complaint.resolution}
          </p>
        )}
      </Card>
      <Card title={hiF.complaints.messages}>
        {complaint.messages.length === 0 ? (
          <p className="text-ink-500">{hiF.complaints.noMessages}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {complaint.messages.map((message, index) => (
              <li key={index} className={cn('max-w-[85%] rounded-2xl p-3', message.mine ? 'self-end bg-primary-50' : 'self-start bg-surface-page')}>
                <p className="text-sm font-bold text-ink-500">{message.mine ? hi.chat.you : hiF.complaints.roles[message.fromRole as keyof typeof hiF.complaints.roles] ?? message.fromRole}</p>
                <p>{message.text}</p>
                <p className="text-sm text-ink-500">{formatDate(message.at)}</p>
              </li>
            ))}
          </ul>
        )}
        {!closed && (
          <div className="mt-3 flex flex-col gap-2">
            <VoiceTextBox id={`reply-${complaint.id}`} label={hiF.complaints.reply} value={reply} onChange={setReply} maxLength={500} />
            <Button variant="accent" size="md" icon={LuSend} disabled={busy || !reply.trim()} onClick={() => void send()}>
              {hi.feedback.send}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
