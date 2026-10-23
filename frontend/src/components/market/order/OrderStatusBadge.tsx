import type { OrderStatus } from '../../../api/marketTypes';
import type { OrdersText } from '../../../strings/en';
import { Badge } from '../../ui/Badge';
import type { Tone } from '../../ui/tones';

const TONES: Record<OrderStatus, Tone> = {
  requested: 'warning',
  accepted: 'neutral',
  rejected: 'danger',
  ready: 'neutral',
  out_for_delivery: 'neutral',
  ready_for_pickup: 'neutral',
  delivered: 'neutral',
  paid: 'success',
  completed: 'success',
  cancelled: 'danger',
};

export function OrderStatusBadge({ status, text }: { status: OrderStatus; text: OrdersText }) {
  return <Badge tone={TONES[status]} label={text.status[status]} />;
}
