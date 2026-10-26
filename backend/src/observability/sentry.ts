import * as Sentry from '@sentry/node';
import type { Request } from 'express';
import { logger } from './logger.js';
import { maskPersonalText } from './redact.js';

let enabled = false;

/**
 * Error tracking (optional). Without SENTRY_DSN nothing is sent anywhere. Sentry receives only the error, its
 * stack, the method + path and the request id: no headers, cookies, bodies, query strings or user details.
 */
export function initSentry({ dsn, environment, release }: { dsn: string | undefined; environment: string; release?: string }): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment,
    release,
    // Collect nothing about the person or the request automatically (the farmer's data stays with us).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    // Errors only, no performance tracing (keeps us inside the free tier).
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) event.request = { method: event.request.method, url: event.request.url?.split('?')[0] };
      delete event.user;
      for (const exception of event.exception?.values ?? []) {
        if (exception.value) exception.value = maskPersonalText(exception.value);
      }
      if (event.message) event.message = maskPersonalText(event.message);
      return event;
    },
    beforeBreadcrumb: (breadcrumb) => (breadcrumb.category === 'console' ? null : breadcrumb),
  });
  enabled = true;
  logger.info('Sentry error tracking is on');
}

/** Reports an unexpected server error (5xx) with the request id, so it can be matched with the logs. */
export function captureServerError(error: unknown, req: Request): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setTag('request_id', String(req.id));
    scope.setContext('request', { method: req.method, path: req.path });
    Sentry.captureException(error);
  });
}

/** Sends queued events before the process exits (graceful shutdown). */
export async function flushSentry(timeoutMs: number): Promise<void> {
  if (enabled) await Sentry.close(timeoutMs);
}
