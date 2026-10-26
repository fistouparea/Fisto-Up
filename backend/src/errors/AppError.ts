/** Error codes sent to the client. The frontend maps each code to a Hindi message. */
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_IMAGE'
  | 'FILE_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_ERROR'
  | 'NOT_FOUND'
  | 'HISTORY_UNAVAILABLE'
  | 'STORAGE_UNAVAILABLE'
  | 'WEATHER_UNAVAILABLE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_LOGIN'
  | 'LOGIN_LOCKED'
  | 'PHONE_TAKEN'
  | 'WEAK_PIN'
  | 'SELLER_PROFILE_MISSING'
  | 'OUT_OF_STOCK'
  | 'INVALID_TRANSITION'
  | 'CONFLICT'
  | 'NEEDS_REPLICA_SET'
  | 'ACTIVE_ORDERS'
  | 'INVITE_REQUIRED'
  | 'INVALID_INVITE'
  | 'INTERNAL';

const HTTP_STATUS: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  INVALID_IMAGE: 400,
  FILE_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  AI_TIMEOUT: 504,
  AI_ERROR: 502,
  NOT_FOUND: 404,
  HISTORY_UNAVAILABLE: 503,
  STORAGE_UNAVAILABLE: 503,
  WEATHER_UNAVAILABLE: 503,
  /** Not logged in (or the session expired). */
  UNAUTHORIZED: 401,
  /** Logged in, but this role or account may not do this. */
  FORBIDDEN: 403,
  INVALID_LOGIN: 401,
  LOGIN_LOCKED: 429,
  PHONE_TAKEN: 409,
  WEAK_PIN: 400,
  /** A seller must fill name, village, UPI ID and pickup place before listing. */
  SELLER_PROFILE_MISSING: 403,
  OUT_OF_STOCK: 409,
  /** The order is not in a state where this step is allowed (or someone else changed it first). */
  INVALID_TRANSITION: 409,
  CONFLICT: 409,
  /** Server setup: orders need MongoDB as a replica set (transactions). See README. */
  NEEDS_REPLICA_SET: 503,
  /** Account deletion: orders that are still running must be finished or cancelled first. */
  ACTIVE_ORDERS: 409,
  /** Pilot: sign-up needs an invite code (feature flag inviteOnly). */
  INVITE_REQUIRED: 403,
  /** Unknown, used up, expired or revoked invite code. */
  INVALID_INVITE: 400,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string = code, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
    this.status = HTTP_STATUS[code];
  }
}
