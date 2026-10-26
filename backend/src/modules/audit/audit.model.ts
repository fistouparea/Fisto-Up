import { model, Schema } from 'mongoose';
import { ROLES } from '../auth/auth.types.js';

/** Everything a coordinator can change (or export). One entry per action. */
export const AUDIT_ACTIONS = [
  'seller.create',
  'seller.verify',
  'seller.reject',
  'listing.createAssisted',
  'listing.update',
  'listing.hide',
  'listing.unhide',
  'report.resolve',
  'order.transition',
  'order.assignDelivery',
  'commission.collect',
  'commission.export',
  'invite.create',
  'invite.revoke',
  'flag.set',
  'help.resolve',
  'metrics.export',
  'scheme.update',
  'service.approve',
  'service.reject',
  'service.booking',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_TARGETS = ['user', 'listing', 'report', 'order', 'commission', 'invite', 'flag', 'help', 'metrics', 'scheme', 'service'] as const;
export type AuditTarget = (typeof AUDIT_TARGETS)[number];

/**
 * Append-only log of coordinator actions: who changed what, when. Details hold ids, statuses and reasons,
 * never PINs or phone numbers. The app never updates or deletes entries (the hooks below refuse it).
 */
const auditLogSchema = new Schema(
  {
    at: { type: Date, required: true, default: () => new Date() },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, enum: ROLES, required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    target: {
      type: new Schema(
        { type: { type: String, enum: AUDIT_TARGETS, required: true }, id: { type: String, required: true } },
        { _id: false },
      ),
      required: true,
    },
    details: { type: Schema.Types.Mixed },
    /** Same id as in the server logs, to find the matching log lines. */
    requestId: String,
  },
  { versionKey: false },
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ 'target.type': 1, 'target.id': 1, at: -1 });
auditLogSchema.index({ actorId: 1, at: -1 });

const refuseChange = () => {
  throw new Error('audit_log is append-only');
};
for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete'] as const) {
  auditLogSchema.pre(operation, refuseChange);
}

export const AuditLogModel = model('AuditLog', auditLogSchema, 'audit_log');
