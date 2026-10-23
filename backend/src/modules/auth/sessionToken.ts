import { jwtVerify, SignJWT } from 'jose';
import { AUTH_RULES } from '../../config/marketRules.js';

export interface SessionClaims {
  userId: string;
  /** Must match the account's tokenVersion; logout bumps it, ending every old session. */
  version: number;
}

const ALGORITHM = 'HS256';
const ISSUER = 'agriai';

/** Signed session tokens (JWT), kept in an httpOnly cookie so page scripts can never read them. */
export class SessionTokens {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }

  sign({ userId, version }: SessionClaims): Promise<string> {
    return new SignJWT({ v: version })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(`${AUTH_RULES.sessionDays}d`)
      .sign(this.key);
  }

  /** Returns null for a missing, expired, tampered or malformed token. */
  async verify(token: string): Promise<SessionClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: [ALGORITHM], issuer: ISSUER });
      if (typeof payload.sub !== 'string' || typeof payload.v !== 'number') return null;
      return { userId: payload.sub, version: payload.v };
    } catch {
      return null;
    }
  }
}

export const SESSION_MAX_AGE_MS = AUTH_RULES.sessionDays * 24 * 60 * 60 * 1000;
