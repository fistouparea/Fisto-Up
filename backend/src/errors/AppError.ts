/** Error codes sent to the client. The frontend maps each code to a Hindi message. */
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_IMAGE'
  | 'FILE_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL';

const HTTP_STATUS: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  INVALID_IMAGE: 400,
  FILE_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  AI_TIMEOUT: 504,
  AI_ERROR: 502,
  NOT_FOUND: 404,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string = code, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
    this.status = HTTP_STATUS[code];
  }
}
