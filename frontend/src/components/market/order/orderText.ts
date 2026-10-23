import type { Order } from '../../../api/marketTypes';
import type { OrdersText } from '../../../strings/en';
import { hi } from '../../../strings/hi';

/** Buyers read orders in their chosen language; sellers and coordinators always in Hindi. */
export function orderTextFor(order: Pick<Order, 'viewerRole'>, buyerText: OrdersText): OrdersText {
  return order.viewerRole === 'buyer' ? buyerText : hi.orders;
}
