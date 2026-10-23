import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { AUTH_RULES } from '../../config/marketRules.js';
import { AppError } from '../../errors/AppError.js';
import { toAuthUser } from './accountView.js';
import type { AuthService } from './auth.service.js';
import type { AuthUser, Role } from './auth.types.js';
import { SESSION_MAX_AGE_MS, type SessionTokens } from './sessionToken.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by the session middleware when a valid login cookie came with the request. */
    user?: AuthUser;
  }
}

/** Reads the login cookie (if any) and attaches the account to `req.user`. Never rejects by itself. */
export function createSessionMiddleware(auth: AuthService, tokens: SessionTokens): RequestHandler {
  return async (req, _res, next) => {
    const token: unknown = req.cookies?.[AUTH_RULES.cookieName];
    if (typeof token === 'string' && token.length > 0) {
      const claims = await tokens.verify(token);
      const user = claims ? await auth.findSessionUser(claims) : null;
      if (user) req.user = toAuthUser(user);
    }
    next();
  };
}

/** The logged-in user, or 401 UNAUTHORIZED. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new AppError('UNAUTHORIZED');
  return req.user;
}

export const requireUser: RequestHandler = (req, _res, next) => {
  currentUser(req);
  next();
};

/** 401 when not logged in, 403 when logged in with another role. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!roles.includes(currentUser(req).role)) throw new AppError('FORBIDDEN');
    next();
  };
}

/**
 * CSRF defence for cookie-authenticated writes: the app sends this header on every request. Other sites cannot
 * add custom headers to a cross-site form post, and CORS blocks them from sending it with fetch.
 * (The cookie is also SameSite=Strict.)
 */
export const APP_HEADER = { name: 'x-requested-with', value: 'agriai' } as const;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const requireAppHeader: RequestHandler = (req, _res, next) => {
  if (!SAFE_METHODS.has(req.method) && req.get(APP_HEADER.name) !== APP_HEADER.value) {
    throw new AppError('FORBIDDEN', 'Missing app header');
  }
  next();
};

export function setSessionCookie(res: Response, token: string, secure: boolean): void {
  res.cookie(AUTH_RULES.cookieName, token, { ...cookieOptions(secure), maxAge: SESSION_MAX_AGE_MS });
}

export function clearSessionCookie(res: Response, secure: boolean): void {
  res.clearCookie(AUTH_RULES.cookieName, cookieOptions(secure));
}

function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', secure, path: '/api' };
}
