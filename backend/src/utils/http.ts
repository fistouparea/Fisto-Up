import { withRetry } from './retry.js';

export interface HttpRetryOptions {
  /** Each attempt is aborted after this long. */
  timeoutMs: number;
  /** Total attempts, including the first. */
  maxAttempts?: number;
  baseDelayMs?: number;
  /** Injected in tests to avoid real waiting. */
  sleep?: (ms: number) => Promise<void>;
}

/** A response worth retrying: the service is overloaded or briefly broken. */
export class RetryableHttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
    this.name = 'RetryableHttpError';
  }
}

/**
 * GET with a timeout per attempt and one retry (by default) for network errors, 429 and 5xx.
 * A timeout is not retried: the service is slow, and waiting twice as long helps nobody on a phone.
 * Other HTTP errors are returned to the caller as they are.
 */
export async function fetchWithRetry(
  fetchFn: typeof fetch,
  url: string,
  { timeoutMs, maxAttempts = 2, baseDelayMs = 500, sleep }: HttpRetryOptions,
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.status === 429 || response.status >= 500) throw new RetryableHttpError(response.status);
      return response;
    },
    { maxAttempts, baseDelayMs, sleep, isRetryable: (error) => !isTimeout(error) },
  );
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError');
}
