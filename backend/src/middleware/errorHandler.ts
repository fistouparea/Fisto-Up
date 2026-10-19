import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../errors/AppError.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND'));
};

/** Single place that turns any error into a safe JSON response: `{ error: { code } }`. */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  const appError = toAppError(error);

  if (appError.status >= 500) {
    console.error(`[${req.method} ${req.path}] ${appError.code}:`, error);
  }

  res.status(appError.status).json({ error: { code: appError.code } });
};

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof MulterError) {
    return error.code === 'LIMIT_FILE_SIZE' ? new AppError('FILE_TOO_LARGE') : new AppError('INVALID_INPUT');
  }
  // Malformed JSON or multipart bodies from body parsers carry a 4xx status.
  if (isClientError(error)) return new AppError('INVALID_INPUT');
  return new AppError('INTERNAL', 'Unexpected error', { cause: error });
}

function isClientError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  const { status } = error;
  return typeof status === 'number' && status >= 400 && status < 500;
}
