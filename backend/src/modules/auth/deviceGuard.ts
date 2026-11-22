import express, { type Request, type RequestHandler } from 'express';
import mongoose from 'mongoose';
import { AUTH_RULES } from '../../config/marketRules.js';
import { AppError } from '../../errors/AppError.js';
import { logger } from '../../observability/logger.js';
import { UserModel } from './user.model.js';
import type { AuthService } from './auth.service.js';
import type { SessionTokens } from './sessionToken.js';

/**
 * Routes that take a data id in a JSON body (query ids are checked on every /api route). A new such route must be
 * added here and to tests/market/accountIsolation.api.test.ts.
 */
const BODY_ID_PATHS = ['/profile', '/history', '/push', '/market/push', '/events', '/consent', '/account/help', '/account/my-data'];

export interface DeviceGuard {
  /** May this request use this data id? A guest's id: yes. An account's id: only with that account's session. */
  allows(req: Request, deviceId: string): Promise<boolean>;
}

export function createDeviceGuard(auth: AuthService, tokens: SessionTokens): DeviceGuard {
  return {
    async allows(req, deviceId) {
      // Without a database there is no stored data to protect, and the advisor must keep working.
      if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) return true;
      const owners = await UserModel.find({ $or: [{ deviceId }, { sharedDeviceId: deviceId }] }, { deviceId: 1 }).limit(2).lean().exec();
      const [owner] = owners;
      if (!owner) return true;
      if (owners.length > 1 || owner.deviceId !== deviceId) return false;

      const token: unknown = req.cookies?.[AUTH_RULES.cookieName];
      const claims = typeof token === 'string' && token ? await tokens.verify(token) : null;
      if (claims?.userId !== owner._id.toString()) return false;
      return (await auth.findSessionUser(claims)) !== null;
    },
  };
}

/** 403 when a request names the data id of another account. */
export function protectDeviceIds(guard: DeviceGuard): RequestHandler[] {
  const check =
    (read: (req: Request) => unknown): RequestHandler =>
    async (req, _res, next) => {
      const deviceId = read(req);
      if (typeof deviceId === 'string' && !(await guard.allows(req, deviceId))) throw new AppError('FORBIDDEN', 'Data id of another account');
      next();
    };
  const json = express.json({ limit: '16kb' });
  const checkBody = check((req) => (req.body as { deviceId?: unknown } | undefined)?.deviceId);

  return [
    // /auth/me is where a phone learns that its id is not (or no longer) its own.
    (req, res, next) => (req.path === '/auth/me' ? next() : check((request) => request.query.deviceId)(req, res, next)),
    (req, res, next) => {
      if (!BODY_ID_PATHS.some((path) => req.path.toLowerCase().startsWith(path))) return next();
      json(req, res, (error?: unknown) => {
        if (error) return next(error);
        void Promise.resolve(checkBody(req, res, next)).catch(next);
      });
    },
  ];
}

/**
 * Photo check: never fail the farmer's check over the id, just do not save the result under it (also when the
 * database cannot say whose it is).
 */
export function dropForeignDeviceId(guard: DeviceGuard): RequestHandler {
  return async (req, _res, next) => {
    const body = req.body as { deviceId?: unknown } | undefined;
    if (body && typeof body.deviceId === 'string') {
      const allowed = await guard.allows(req, body.deviceId).catch((error: unknown) => {
        logger.warn({ err: error }, 'data id not checked, photo check is not saved');
        return false;
      });
      if (!allowed) delete body.deviceId;
    }
    next();
  };
}
