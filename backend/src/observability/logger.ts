import { pino, stdSerializers, type DestinationStream, type Logger, type LoggerOptions } from 'pino';
import { maskPersonalText, REDACT_PATHS } from './redact.js';

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Errors keep their type and stack, with phone numbers and tokens masked out of the text. */
function serializeError(error: Error) {
  const serialized = stdSerializers.err(error);
  return {
    ...serialized,
    message: maskPersonalText(serialized.message),
    ...(serialized.stack && { stack: maskPersonalText(serialized.stack) }),
  };
}

/** `destination` is for tests (capture lines); the app writes to stdout. */
export function createLogger(level: LogLevel, pretty: boolean, destination?: DestinationStream): Logger {
  const options: LoggerOptions = {
    level,
    base: { service: 'agriai-backend' },
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    serializers: { err: serializeError, error: serializeError },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  // Readable lines in development; JSON lines (one per event) in production for the hosting log viewer.
  if (destination) return pino(options, destination);
  return pretty ? pino({ ...options, transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } } }) : pino(options);
}

function defaultLevel(): LogLevel {
  const fromEnv = LOG_LEVELS.find((level) => level === process.env.LOG_LEVEL);
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === 'test' ? 'silent' : 'info';
}

/** The one logger of the app. LOG_LEVEL overrides the level; tests are silent by default. */
export const logger = createLogger(defaultLevel(), (process.env.NODE_ENV ?? 'development') === 'development' && process.stdout.isTTY);
