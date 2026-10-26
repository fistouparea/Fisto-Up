import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../errors/AppError.js';
import { logger } from '../observability/logger.js';
import { captureServerError } from '../observability/sentry.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND'));
};

/** Single place that turns any error into a safe JSON response: `{ error: { code } }`. */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  const appError = toAppError(error);

  if (appError.status >= 500) {
    // req.log carries the request id; the details stay on the server, the client only gets the code.
    (req.log ?? logger).error({ err: error, code: appError.code }, 'request failed');
    captureServerError(error, req);
  }

  res.status(appError.status).json({ error: { code: appError.code } });
};

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof MulterError) {
    return error.code === 'LIMIT_FILE_SIZE' ? new AppError('FILE_TOO_LARGE') : new AppError('INVALID_INPUT');
  }
  if (isNoReplicaSet(error)) {
    return new AppError('NEEDS_REPLICA_SET', 'MongoDB is not a replica set: orders need transactions (README: "MongoDB replica set")', { cause: error });
  }
  if (isStorageDown(error)) return new AppError('STORAGE_UNAVAILABLE', 'MongoDB is not reachable', { cause: error });
  // Malformed JSON or multipart bodies from body parsers carry a 4xx status.
  if (isClientError(error)) return new AppError('INVALID_INPUT');
  return new AppError('INTERNAL', 'Unexpected error', { cause: error });
}

function isClientError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  const { status } = error;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/** MongoDB unreachable (marketplace code uses mongoose directly, so its errors arrive here). */
const STORAGE_DOWN_ERRORS = new Set(['MongoNetworkError', 'MongoServerSelectionError', 'MongoNotConnectedError']);

function isStorageDown(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // With bufferCommands off, mongoose throws "...before initial connection is complete" while disconnected.
  return STORAGE_DOWN_ERRORS.has(error.name) || /initial connection|Client must be connected/i.test(error.message);
}

/**
 * MongoDB refuses transactions on a standalone server. The wording differs by version:
 * "Transaction numbers are only allowed on a replica set member or mongos" or "does not support retryable writes".
 */
function isNoReplicaSet(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === 'MongoServerError' &&
    /replica set member or mongos|does not support retryable writes/i.test(error.message)
  );
}
