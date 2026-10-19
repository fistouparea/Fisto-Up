import { ERROR_CODES, type CropId, type DiagnoseResponse, type ErrorCode } from './types';

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

/** Uploads the photo and crop. Resolves with the diagnosis or throws an ApiError. */
export async function diagnoseCrop(crop: CropId, photo: Blob): Promise<DiagnoseResponse> {
  const form = new FormData();
  form.append('crop', crop);
  form.append('image', photo, 'photo.jpg');

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/diagnose`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ApiError(error instanceof DOMException && error.name === 'TimeoutError' ? 'AI_TIMEOUT' : 'NETWORK');
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(readErrorCode(body));
  }
  if (!isDiagnoseResponse(body)) {
    throw new ApiError('UNKNOWN');
  }
  return body;
}

function readErrorCode(body: unknown): ErrorCode {
  const code = isRecord(body) && isRecord(body.error) ? body.error.code : undefined;
  return ERROR_CODES.find((known) => known === code) ?? 'UNKNOWN';
}

function isDiagnoseResponse(body: unknown): body is DiagnoseResponse {
  if (!isRecord(body)) return false;
  if (body.status === 'unclear') return true;
  return body.status === 'ok' && isRecord(body.diagnosis);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
