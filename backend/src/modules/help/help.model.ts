import { model, Schema } from 'mongoose';
import { ROLES } from '../auth/auth.types.js';

export const HELP_CATEGORIES = ['crop', 'app', 'order', 'payment', 'account', 'other'] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];

/** "मदद/शिकायत" from the app. Coordinators read and close them. Text only (spoken words become text on the phone). */
const helpRequestSchema = new Schema(
  {
    category: { type: String, enum: HELP_CATEGORIES, required: true },
    message: { type: String, required: true },
    deviceId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userRole: { type: String, enum: ROLES },
    /** Only if the person asked to be called back (farmers without an account). */
    callbackPhone: String,
    status: { type: String, enum: ['open', 'resolved'], required: true, default: 'open' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolution: String,
  },
  { timestamps: true, versionKey: false },
);
helpRequestSchema.index({ status: 1, createdAt: -1 });

export const HelpRequestModel = model('HelpRequest', helpRequestSchema, 'help_requests');
