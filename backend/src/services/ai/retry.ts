export interface RetryOptions {
  /** Total attempts, including the first one. */
  maxAttempts: number;
  /** Delay before the first retry. Doubles after each retry, with random jitter. */
  baseDelayMs: number;
  isRetryable: (error: unknown) => boolean;
  /** Injected in tests to avoid real waiting. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs `operation`, retrying retryable failures with exponential backoff. */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= options.maxAttempts || !options.isRetryable(error)) {
        throw error;
      }
      await sleep(backoffDelay(attempt, options.baseDelayMs));
    }
  }
}

/** base * 2^(attempt-1), plus up to 25% jitter so many clients don't retry at the same moment. */
export function backoffDelay(attempt: number, baseDelayMs: number): number {
  const delay = baseDelayMs * 2 ** (attempt - 1);
  return Math.round(delay + delay * 0.25 * Math.random());
}
