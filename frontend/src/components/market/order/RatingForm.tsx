import { useState } from 'react';
import { LuSend, LuStar } from 'react-icons/lu';
import { ApiError } from '../../../api/client';
import type { Order } from '../../../api/marketTypes';
import { rateOrder } from '../../../api/orders';
import type { OrdersText } from '../../../strings/en';
import { cn } from '../../../utils/cn';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { TextField } from '../../ui/TextField';
import { notifyError, notifySuccess } from '../../ui/notify';

/** Five big stars and an optional comment, after the order is completed. */
export function RatingForm({ order, text, onRated }: { order: Order; text: OrdersText; onRated: (order: Order) => void }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      onRated(await rateOrder(order.id, stars, comment.trim() || undefined));
      notifySuccess(text.thanksRating);
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
      setBusy(false);
    }
  };

  return (
    <Card icon={LuStar} title={text.rateTitle} speakText={text.rateTitle}>
      <div className="flex justify-center gap-1" role="radiogroup" aria-label={text.rateTitle}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={stars === value}
            aria-label={`${value} ${text.stars}`}
            onClick={() => setStars(value)}
            className="flex size-14 items-center justify-center rounded-full hover:bg-accent-50"
          >
            <LuStar aria-hidden="true" className={cn('size-10', value <= stars ? 'fill-accent-400 text-accent-500' : 'text-ink-300')} />
          </button>
        ))}
      </div>
      {stars > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          <TextField label={text.rateComment} value={comment} maxLength={300} onChange={(e) => setComment(e.target.value)} />
          <Button variant="accent" icon={LuSend} disabled={busy} onClick={() => void submit()}>
            {text.rateSubmit}
          </Button>
        </div>
      )}
    </Card>
  );
}
