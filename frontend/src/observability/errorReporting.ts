import { maskPersonalText } from './maskPersonalText';

type SentryModule = typeof import('@sentry/react');

const DSN = import.meta.env.VITE_SENTRY_DSN;
let sentry: Promise<SentryModule> | null = null;

/**
 * Error tracking for the farmer app (optional). Without VITE_SENTRY_DSN nothing is loaded or sent.
 * With it, the Sentry code is downloaded after the app has started (its own small file), so slow phones
 * do not pay for it on first paint. Reports never contain the user, request bodies, phone numbers or photos.
 */
export function initErrorReporting(): void {
  if (!DSN || sentry) return;
  sentry = import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
      release: import.meta.env.VITE_RELEASE,
      // Errors only: no performance tracing, no session replay (free tier, and the farmer's screen stays private).
      tracesSampleRate: 0,
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
      beforeSend(event) {
        delete event.user;
        if (event.request?.url) event.request = { url: event.request.url.split('?')[0] };
        if (event.message) event.message = maskPersonalText(event.message);
        for (const exception of event.exception?.values ?? []) {
          if (exception.value) exception.value = maskPersonalText(exception.value);
        }
        return event;
      },
      beforeBreadcrumb: (breadcrumb) => (breadcrumb.category === 'console' || breadcrumb.category === 'ui.input' ? null : breadcrumb),
    });
    return Sentry;
  });
}

/** Reports an error caught by an error boundary. Does nothing when error tracking is off. */
export function reportError(error: unknown, componentStack?: string | null): void {
  void sentry?.then((Sentry) => Sentry.captureException(error, { extra: { componentStack: componentStack ?? undefined } }));
}
