/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Sentry DSN of the frontend project (optional; empty = no error tracking). */
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  /** Release name shown in Sentry, e.g. the git commit. */
  readonly VITE_RELEASE?: string;
}
