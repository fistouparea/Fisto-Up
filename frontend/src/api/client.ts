import { reportNetworkFailure, reportServerReached } from '../utils/connectivity';
import { ERROR_CODES, type ErrorCode } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** Covers a slow upload plus the backend's own AI timeout and retries. */
const REQUEST_TIMEOUT_MS = 90_000;

export class ApiError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Calls the backend and returns the response body if `isValid` accepts it.
 * Every failure becomes an ApiError with a code the UI can show in Hindi.
 */
export async function requestApi<T>(
  path: string,
  init: RequestInit,
  isValid: (body: unknown) => body is T,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    if (!timedOut) reportNetworkFailure();
    throw new ApiError(timedOut ? 'AI_TIMEOUT' : 'NETWORK');
  }
  reportServerReached();

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(readErrorCode(body));
  }
  if (!isValid(body)) {
    throw new ApiError('UNKNOWN');
  }
  return body;
}

export function postJson<T>(path: string, payload: unknown, isValid: (body: unknown) => body is T): Promise<T> {
  return requestApi(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    isValid,
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorCode(body: unknown): ErrorCode {
  const code = isRecord(body) && isRecord(body.error) ? body.error.code : undefined;
  return ERROR_CODES.find((known) => known === code) ?? 'UNKNOWN';
}
