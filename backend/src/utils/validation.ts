import type { z } from 'zod';
import { AppError } from '../errors/AppError.js';

/** Validates request data; any problem becomes a 400 INVALID_INPUT without internal details. */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError('INVALID_INPUT', 'Request validation failed');
  }
  return result.data;
}

/** Optional storage-backed features return 503 STORAGE_UNAVAILABLE when MongoDB is not configured. */
export function requireRepository<T>(repository: T | null): T {
  if (!repository) {
    throw new AppError('STORAGE_UNAVAILABLE', 'Storage is not configured (MONGO_URI missing)');
  }
  return repository;
}
