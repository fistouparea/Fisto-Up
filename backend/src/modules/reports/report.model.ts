import { model, Schema } from 'mongoose';
import { ROLES } from '../auth/auth.types.js';

export const REPORT_REASONS = ['quality', 'not_delivered', 'payment', 'wrong_item', 'fake_listing', 'behaviour', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** A problem reported by a buyer or seller, about an order or a listing. Coordinators review it. */
const reportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reporterRole: { type: String, enum: ROLES, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', index: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    text: String,
    status: { type: String, enum: ['open', 'resolved'], required: true, default: 'open' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolution: String,
    demo: Boolean,
  },
  { timestamps: true, versionKey: false },
);

reportSchema.index({ status: 1, createdAt: -1 });

export const ReportModel = model('Report', reportSchema, 'reports');
