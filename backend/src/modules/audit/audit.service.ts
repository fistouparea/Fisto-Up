import type { Request } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { UserModel } from '../auth/user.model.js';
import { currentUser } from '../auth/auth.middleware.js';
import { AUDIT_ACTIONS, AuditLogModel, type AuditAction, type AuditTarget } from './audit.model.js';
import { logger } from '../../observability/logger.js';

export type AuditDetails = Record<string, string | number | boolean | null | undefined>;

export interface AuditEntryView {
  id: string;
  at: Date;
  actorId: string;
  actorRole: string;
  /** Looked up when reading, so the log itself keeps no names. */
  actorName?: string;
  action: AuditAction;
  target: { type: AuditTarget; id: string; name?: string };
  details?: AuditDetails;
}

/**
 * Records a coordinator action after it succeeded. A failed audit write is logged as an error (and reaches
 * error tracking) but never undoes or fails the action the coordinator already completed.
 */
export async function audit(req: Request, action: AuditAction, target: { type: AuditTarget; id: string }, details?: AuditDetails): Promise<void> {
  const actor = currentUser(req);
  try {
    await AuditLogModel.create({ actorId: actor.id, actorRole: actor.role, action, target, details, requestId: String(req.id) });
  } catch (error) {
    logger.error({ err: error, action, target }, 'audit log write failed');
  }
}

export const auditQuerySchema = z.object({
  action: z.enum(AUDIT_ACTIONS).optional(),
  targetId: z.string().trim().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

const PAGE_SIZE = 50;

export async function listAudit({ action, targetId, page }: z.infer<typeof auditQuerySchema>): Promise<{ items: AuditEntryView[]; hasMore: boolean }> {
  const rows = await AuditLogModel.find({ ...(action && { action }), ...(targetId && { 'target.id': targetId }) })
    .sort({ at: -1, _id: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE + 1)
    .lean()
    .exec();
  const userIds = rows.flatMap((row) => [row.actorId.toString(), ...(row.target.type === 'user' ? [row.target.id] : [])]);
  const users = await UserModel.find({ _id: { $in: [...new Set(userIds)].filter((id) => isValidObjectId(id)) } }, { name: 1 }).lean().exec();
  const nameById = new Map(users.map((user) => [user._id.toString(), user.name]));
  return {
    items: rows.slice(0, PAGE_SIZE).map((row) => ({
      id: row._id.toString(),
      at: row.at,
      actorId: row.actorId.toString(),
      actorRole: row.actorRole,
      ...(nameById.has(row.actorId.toString()) && { actorName: nameById.get(row.actorId.toString()) }),
      action: row.action,
      target: { type: row.target.type, id: row.target.id, ...(nameById.has(row.target.id) && { name: nameById.get(row.target.id) }) },
      ...(row.details && { details: row.details as AuditDetails }),
    })),
    hasMore: rows.length > PAGE_SIZE,
  };
}
