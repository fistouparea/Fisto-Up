import { model, Schema } from 'mongoose';

/** A phone's web push subscription. One device may have several (e.g. after reinstalling). */
const pushSubscriptionSchema = new Schema(
  {
    deviceId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      type: new Schema({ p256dh: { type: String, required: true }, auth: { type: String, required: true } }, { _id: false }),
      required: true,
    },
    sentIds: { type: [String], default: [] },
    /** Marketplace: the logged-in account on this phone (order notifications). Removed on logout. */
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true, versionKey: false },
);

export const PushSubscriptionModel = model('PushSubscription', pushSubscriptionSchema, 'push_subscriptions');
