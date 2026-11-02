import { model, Schema } from 'mongoose';
import { ORDER_STATUSES } from '../orders/orderStateMachine.js';

/** In-app marketplace notification ("नया ऑर्डर", "ऑर्डर मंज़ूर", ...). */
const marketNotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    /** Order status the message is about, "report" for problem reports, "service" for bookings/approvals. */
    kind: { type: String, enum: [...ORDER_STATUSES, 'report', 'service', 'mandiTrip', 'delivery', 'complaint'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    /** App route to open, e.g. "#/orders/<id>". */
    href: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

marketNotificationSchema.index({ userId: 1, createdAt: -1 });
// Unread badge count (polled every 30 s by every logged-in phone).
marketNotificationSchema.index({ userId: 1, read: 1 });

export const MarketNotificationModel = model('MarketNotification', marketNotificationSchema, 'market_notifications');
