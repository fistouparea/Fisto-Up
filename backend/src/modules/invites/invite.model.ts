import { model, Schema } from 'mongoose';
import { SELF_SIGNUP_ROLES } from '../auth/auth.types.js';

/**
 * A pilot invite code made by a coordinator, e.g. one code for a whole SHG group (maxUses 12).
 * `uses` only ever goes up through an atomic update, so a code can never be used more often than allowed.
 */
const inviteCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Only this role may sign up with it (none = seller or buyer). */
    role: { type: String, enum: SELF_SIGNUP_ROLES },
    /** Who it is for, e.g. "घांघू SHG" (shown to coordinators only). */
    note: String,
    maxUses: { type: Number, required: true, min: 1 },
    uses: { type: Number, required: true, default: 0 },
    expiresAt: Date,
    revokedAt: Date,
  },
  { timestamps: true, versionKey: false },
);
inviteCodeSchema.index({ createdAt: -1 });

export const InviteCodeModel = model('InviteCode', inviteCodeSchema, 'invite_codes');
export type InviteCodeDocument = InstanceType<typeof InviteCodeModel>;
