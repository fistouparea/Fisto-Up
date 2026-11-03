import { model, Schema } from 'mongoose';
import { ROLES } from '../auth/auth.types.js';
import { COMPLAINT_STATUSES } from '../../config/complaintRules.js';

export const REPORT_REASONS = ['quality', 'not_delivered', 'payment', 'wrong_item', 'fake_listing', 'behaviour', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * A complaint ("समस्या बताएँ" / शिकायत) about an order, a service booking, a market listing or a service
 * listing. One collection for all of them, so coordinators work one queue. `againstUserId` is the seller /
 * owner the complaint is about (for "repeated complaints" and to let them answer).
 */
const reportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reporterRole: { type: String, enum: ROLES, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'ServiceBooking' },
    serviceListingId: { type: Schema.Types.ObjectId, ref: 'ServiceListing' },
    againstUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    /** Optional photo (private: reporter, the other side and coordinators). */
    photoId: { type: Schema.Types.ObjectId, ref: 'ListingPhoto' },
    /** The coordinator should answer before this time (SLA). */
    slaDueAt: Date,
    /** Coordinator ↔ reporter ↔ the other side. */
    messages: [
      {
        _id: false,
        fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        fromRole: { type: String, enum: [...ROLES], required: true },
        text: { type: String, required: true },
        at: { type: Date, required: true },
      },
    ],
    statusHistory: [{ _id: false, status: { type: String, enum: COMPLAINT_STATUSES, required: true }, at: { type: Date, required: true }, byUserId: { type: Schema.Types.ObjectId, ref: 'User' } }],
    reason: { type: String, enum: REPORT_REASONS, required: true },
    text: String,
    status: { type: String, enum: COMPLAINT_STATUSES, required: true, default: 'open' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolution: String,
    demo: Boolean,
  },
  { timestamps: true, versionKey: false },
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ againstUserId: 1, status: 1, resolvedAt: -1 });
reportSchema.index({ reporterId: 1, createdAt: -1 });

export const ReportModel = model('Report', reportSchema, 'reports');
