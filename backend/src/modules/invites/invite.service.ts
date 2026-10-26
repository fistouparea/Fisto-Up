import { randomInt } from 'node:crypto';
import { isValidObjectId, mongo } from 'mongoose';
import { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import { SELF_SIGNUP_ROLES, type Role } from '../auth/auth.types.js';

type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];
import { InviteCodeModel, type InviteCodeDocument } from './invite.model.js';

export const INVITE_RULES = {
  codeLength: 6,
  /** Letters and digits that are not confused when read out on the phone (no 0/O, 1/I/L). */
  alphabet: '23456789ABCDEFGHJKMNPQRSTUVWXYZ',
  maxUses: 200,
  maxDays: 180,
} as const;

/** "agr-7k2 m9p" → "AGR7K2M9P": what a person types, normalised. */
export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(new RegExp(`^[${INVITE_RULES.alphabet}]{${INVITE_RULES.codeLength}}$`)));

export const createInviteBodySchema = z.object({
  maxUses: z.coerce.number().int().min(1).max(INVITE_RULES.maxUses).default(1),
  role: z.enum(SELF_SIGNUP_ROLES).optional(),
  note: z.string().trim().max(80).optional(),
  expiresInDays: z.coerce.number().int().min(1).max(INVITE_RULES.maxDays).optional(),
});

export interface InviteView {
  id: string;
  code: string;
  role?: Role;
  note?: string;
  maxUses: number;
  uses: number;
  expiresAt?: Date;
  revoked: boolean;
  usable: boolean;
  createdAt: Date;
}

export function toInviteView(invite: InviteCodeDocument, now = new Date()): InviteView {
  return {
    id: invite._id.toString(),
    code: invite.code,
    ...(invite.role && { role: invite.role }),
    ...(invite.note && { note: invite.note }),
    maxUses: invite.maxUses,
    uses: invite.uses,
    ...(invite.expiresAt && { expiresAt: invite.expiresAt }),
    revoked: Boolean(invite.revokedAt),
    usable: !invite.revokedAt && invite.uses < invite.maxUses && (!invite.expiresAt || invite.expiresAt > now),
    createdAt: invite.createdAt,
  };
}

function newCode(): string {
  return Array.from({ length: INVITE_RULES.codeLength }, () => INVITE_RULES.alphabet[randomInt(INVITE_RULES.alphabet.length)]).join('');
}

export async function createInvite(body: z.infer<typeof createInviteBodySchema>, coordinatorId: string, now = new Date()): Promise<InviteCodeDocument> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await InviteCodeModel.create({
        code: newCode(),
        createdBy: coordinatorId,
        role: body.role,
        note: body.note,
        maxUses: body.maxUses,
        ...(body.expiresInDays && { expiresAt: new Date(now.getTime() + body.expiresInDays * 86_400_000) }),
      });
    } catch (error) {
      if (!(error instanceof mongo.MongoServerError && error.code === 11000 && attempt < 3)) throw error;
    }
  }
}

export async function listInvites(): Promise<InviteCodeDocument[]> {
  return InviteCodeModel.find().sort({ createdAt: -1 }).limit(200).exec();
}

export async function revokeInvite(id: string, now = new Date()): Promise<InviteCodeDocument> {
  const invite = isValidObjectId(id) ? await InviteCodeModel.findByIdAndUpdate(id, { $set: { revokedAt: now } }, { returnDocument: 'after' }).exec() : null;
  if (!invite) throw new AppError('NOT_FOUND');
  return invite;
}

/**
 * Takes one use of a code for a new account of `role`, atomically (two people can never take the last use).
 * Returns the invite id. INVALID_INVITE for unknown, used up, expired, revoked or wrong-role codes.
 */
export async function redeemInvite(code: string, role: SelfSignupRole, now = new Date()): Promise<string> {
  const invite = await InviteCodeModel.findOneAndUpdate(
    {
      code,
      revokedAt: { $exists: false },
      $expr: { $lt: ['$uses', '$maxUses'] },
      $and: [{ $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] }, { $or: [{ role: { $exists: false } }, { role }] }],
    },
    { $inc: { uses: 1 } },
    { returnDocument: 'after' },
  ).exec();
  if (!invite) throw new AppError('INVALID_INVITE');
  return invite._id.toString();
}

/** Gives a use back when the account could not be created after all (e.g. the phone was already registered). */
export async function releaseInvite(inviteId: string): Promise<void> {
  await InviteCodeModel.updateOne({ _id: inviteId, uses: { $gt: 0 } }, { $inc: { uses: -1 } }).exec();
}
