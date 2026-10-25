import type { Request } from 'express';
import { z } from 'zod';
import { currentUser } from '../auth/auth.middleware.js';
import { AUDIT_ACTIONS, AuditLogModel, type AuditAction, type AuditTarget } from './audit.model.js';

export type AuditDetails = Record<string, string | number | boolean | null | undefined>;

export interface AuditEntryView {
  id: string;
  at: Date;
  actorId: string;
  actorRole: string;
  action: AuditAction;
  target: { type: AuditTarget; id: string };
  details?: AuditDetails;
}

/**
 * Records a coordinator action after it succeeded. A failed audit write is logged as an error (and reaches
 * error tracking) but never undoes or fails the action the coordinator already completed.
 */
export async function audit(req: Request, action: AuditAction, target: { type: AuditTarget; id: string }, details?: AuditDetails): Promise<void> {
  const actor = currentUser(req);
  try {
    await AuditLogModel.create({ actorId: actor.id, actorRole: actor.role, action, target, details });
  } catch (error) {
    console.error('audit log write failed', action, target, error);
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
  return {
    items: rows.slice(0, PAGE_SIZE).map((row) => ({
      id: row._id.toString(),
      at: row.at,
      actorId: row.actorId.toString(),
      actorRole: row.actorRole,
      action: row.action,
      target: { type: row.target.type, id: row.target.id },
      ...(row.details && { details: row.details as AuditDetails }),
    })),
    hasMore: rows.length > PAGE_SIZE,
  };
}
