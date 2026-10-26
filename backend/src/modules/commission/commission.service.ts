import type { ClientSession } from 'mongoose';
import { commissionPaise } from '../../config/marketRules.js';
import { todayInIndia } from '../../utils/dates.js';
import type { OrderDocument } from '../orders/order.model.js';
import { CommissionEntryModel } from './commission.model.js';

/** "2026-11" in India time. */
export function indiaMonth(date: Date): string {
  return todayInIndia(date).slice(0, 7);
}

/**
 * Adds the commission line for a completed order, inside the order's transaction.
 * The unique orderId index makes a second charge for the same order impossible.
 */
export async function recordCommission(order: OrderDocument, rateBps: number, completedAt: Date, session: ClientSession): Promise<number> {
  const amountPaise = commissionPaise(order.totalPaise, rateBps);
  await CommissionEntryModel.create(
    [
      {
        orderId: order._id,
        orderRef: order.ref,
        type: order.referral ? 'partner_referral' : 'order',
        sellerId: order.sellerId,
        orderTotalPaise: order.totalPaise,
        rateBps,
        amountPaise,
        month: indiaMonth(completedAt),
        completedAt,
      },
    ],
    { session },
  );
  return amountPaise;
}
