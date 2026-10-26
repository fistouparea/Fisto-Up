import { model, Schema } from 'mongoose';

export const COMMISSION_STATUSES = ['due', 'collected'] as const;
/** order: a normal marketplace order. partner_referral: an input dealer's order that came from the "ज़रूरी सामान" kit. */
export const COMMISSION_TYPES = ['order', 'partner_referral'] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

/** One ledger line per completed order: our commission, collected offline by a coordinator. */
const commissionEntrySchema = new Schema(
  {
    /** Unique: an order can never be charged twice. */
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    orderRef: { type: String, required: true },
    type: { type: String, enum: COMMISSION_TYPES, required: true, default: 'order' },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderTotalPaise: { type: Number, required: true },
    /** Rate at completion time in basis points (300 = 3%), kept so later rate changes do not rewrite history. */
    rateBps: { type: Number, required: true },
    amountPaise: { type: Number, required: true },
    /** "YYYY-MM" in India time, for monthly totals. */
    month: { type: String, required: true, index: true },
    completedAt: { type: Date, required: true },
    status: { type: String, enum: COMMISSION_STATUSES, required: true, default: 'due' },
    collectedAt: Date,
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    demo: Boolean,
  },
  { timestamps: true, versionKey: false },
);

// Dues per seller ("वसूल किया") and the CSV export in completion order.
commissionEntrySchema.index({ sellerId: 1, status: 1 });
commissionEntrySchema.index({ completedAt: 1 });

export const CommissionEntryModel = model('CommissionEntry', commissionEntrySchema, 'commission_ledger');
