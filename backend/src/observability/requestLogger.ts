import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Health probes run every few seconds; logging them would bury the real requests. */
const QUIET_PATHS = new Set(['/health', '/ready', '/api/health']);

/** Keeps a request id from a trusted proxy (nginx, Render) if it looks sane; otherwise makes a new one. */
function requestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

/** Path without the query string: queries can carry the anonymous device id or search words. */
function pathOnly(url: string | undefined): string {
  return (url ?? '').split('?')[0] ?? '';
}

/**
 * One log line per request with its id, method, path, status and duration. Every log written while handling
 * the request (`req.log`) carries the same `reqId`. Headers, bodies and query strings are never logged.
 */
export function createRequestLogger(): RequestHandler {
  return pinoHttp({
    logger,
    genReqId: requestId,
    autoLogging: { ignore: (req) => QUIET_PATHS.has(pathOnly(req.url)) },
    customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    serializers: {
      req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, path: pathOnly(req.url) }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
