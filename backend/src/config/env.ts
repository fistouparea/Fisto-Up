import { z } from 'zod';
import { COMMISSION_RULES, percentToBps } from './marketRules.js';
import { LOG_LEVELS } from '../observability/logger.js';
import { parseCloudinaryUrl } from '../services/storage/cloudinaryStorage.js';
import { STORAGE_PROVIDERS } from '../services/storage/photoStorage.js';

/** Optional value; an empty line in .env (e.g. "DATA_GOV_API_KEY=") counts as not set. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema.optional());
}

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().min(1, 'GEMINI_MODEL is required'),
  AI_PROVIDER: z.enum(['gemini']).default('gemini'),
  /**
   * How much the model "thinks" before answering. Newer Gemini models think a lot by default
   * (a photo check took ~90 s); "low" answers in a few seconds. "off" sends no setting (older models).
   */
  /**
   * Comma-separated models tried when GEMINI_MODEL is busy ("high demand"), slow or gives bad JSON,
   * e.g. "gemini-3.5-flash,gemini-3.1-flash-lite". Empty = no fallback.
   */
  GEMINI_FALLBACK_MODELS: z
    .string()
    .optional()
    .transform((value) => (value ?? '').split(',').map((model) => model.trim()).filter(Boolean)),
  /** Seconds one model may take before the next attempt / fallback model. Lower = faster fallback when busy. */
  GEMINI_ATTEMPT_TIMEOUT_SECONDS: optional(z.coerce.number().int().min(5).max(120)),
  GEMINI_THINKING_LEVEL: z.enum(['low', 'medium', 'high', 'off']).default('low'),
  PORT: z.coerce.number().int().positive().default(4000),
  /** Number of reverse proxies in front of the app (1 behind nginx in Docker), so rate limits see real client IPs. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Optional. Without it the app works, but diagnosis history is turned off. */
  MONGO_URI: optional(z.string().trim().min(1)),
  /** Mandi prices from data.gov.in (optional). Free key: https://data.gov.in → My Account → API key. */
  DATA_GOV_API_KEY: optional(z.string().trim().min(1)),
  /** Web push (optional). Generate with: npx web-push generate-vapid-keys */
  VAPID_PUBLIC_KEY: optional(z.string().trim().min(1)),
  VAPID_PRIVATE_KEY: optional(z.string().trim().min(1)),
  /** Contact for push services, e.g. mailto:you@example.com */
  VAPID_SUBJECT: optional(z.string().trim().regex(/^(mailto:|https:)/, 'must start with mailto: or https:')),
  /**
   * Signs login cookies for the marketplace (min 32 characters, e.g. `openssl rand -hex 32`).
   * Without it (or without MONGO_URI) the marketplace is off and the advisor still works.
   */
  JWT_SECRET: optional(z.string().trim().min(32, 'JWT_SECRET must be at least 32 characters')),
  /** Send the login cookie only over HTTPS. Defaults to on when NODE_ENV=production. */
  COOKIE_SECURE: optional(z.enum(['true', 'false']).transform((value) => value === 'true')),
  NODE_ENV: optional(z.enum(['development', 'production', 'test'])).default('development'),
  /** Our commission on completed orders, in percent (2–5). */
  COMMISSION_PERCENT: optional(
    z.coerce.number().min(COMMISSION_RULES.minPercent).max(COMMISSION_RULES.maxPercent),
  ),
  /** Where listing photos are stored: "database" (MongoDB, default) or "cloudinary" (production). */
  STORAGE_PROVIDER: optional(z.enum(STORAGE_PROVIDERS)).default('database'),
  /** Cloudinary dashboard → "API environment variable": cloudinary://<key>:<secret>@<cloud>. Keep secret. */
  CLOUDINARY_URL: optional(z.string().trim()),
  CLOUDINARY_FOLDER: optional(z.string().trim().regex(/^[\w/-]{1,100}$/)).default('agriai/listings'),
  /** Pilot: only sign-ups with an invite code (default for the inviteOnly flag; coordinators can change it). */
  INVITE_ONLY: optional(z.enum(['true', 'false']).transform((value) => value === 'true')),
  /** Log detail: info (default), warn, error, debug ... Tests default to silent. */
  LOG_LEVEL: optional(z.enum(LOG_LEVELS)),
  /** Sentry error tracking (optional, free tier): the backend project's DSN. Empty = off. */
  SENTRY_DSN: optional(z.url()),
  /** Shown in Sentry, e.g. "production" or "pilot". Defaults to NODE_ENV. */
  SENTRY_ENVIRONMENT: optional(z.string().trim().max(40)),
  /** Set by Render on every deploy; used as the release name in Sentry. */
  RENDER_GIT_COMMIT: optional(z.string().trim().max(64)),
  /**
   * Frontend URL(s) allowed by CORS, comma-separated. Each must be a plain origin (`https://app.example.com`,
   * no path, no `*`). Required in production; development defaults to the Vite dev server.
   */
  CORS_ORIGIN: optional(
    z
      .string()
      .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
      .pipe(z.array(z.string().refine(isPlainOrigin, 'each entry must be an origin like https://app.example.com')).min(1)),
  ),
});

const DEV_CORS_ORIGIN = 'http://localhost:5173';

function isPlainOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === value;
  } catch {
    return false;
  }
}

/** Settings that are optional in development but must be explicit in production. */
const productionChecks = envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;
  const require = (key: keyof typeof env, why: string) => {
    if (env[key] === undefined) ctx.addIssue({ code: 'custom', path: [key], message: `required in production (${why})` });
  };
  require('CORS_ORIGIN', 'the frontend URL, e.g. https://agriai.example.com');
  require('MONGO_URI', 'history, farm profiles, marketplace and consent need the database');
  require('JWT_SECRET', 'the marketplace and pilot logins need it');
});

const storageChecks = productionChecks.superRefine((env, ctx) => {
  if (env.STORAGE_PROVIDER === 'cloudinary' && !(env.CLOUDINARY_URL && parseCloudinaryUrl(env.CLOUDINARY_URL, env.CLOUDINARY_FOLDER))) {
    ctx.addIssue({ code: 'custom', path: ['CLOUDINARY_URL'], message: 'STORAGE_PROVIDER=cloudinary needs CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>' });
  }
});

const envWithDefaults = storageChecks.transform((env) => ({ ...env, CORS_ORIGIN: env.CORS_ORIGIN ?? [DEV_CORS_ORIGIN] }));

export type Env = z.infer<typeof envWithDefaults>;

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/** Push is on only when all three VAPID values are set. */
export function vapidConfig(env: Env): VapidConfig | null {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env;
  return VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT
    ? { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY, subject: VAPID_SUBJECT }
    : null;
}

export interface MarketConfig {
  jwtSecret: string;
  cookieSecure: boolean;
  /** Commission rate in basis points (300 = 3%). */
  commissionBps: number;
}

/** The marketplace needs accounts, so it is on only with MongoDB and a JWT secret. */
export function marketConfig(env: Env): MarketConfig | null {
  if (!env.MONGO_URI || !env.JWT_SECRET) return null;
  return {
    jwtSecret: env.JWT_SECRET,
    cookieSecure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    commissionBps: percentToBps(env.COMMISSION_PERCENT ?? COMMISSION_RULES.defaultPercent),
  };
}

/** Reads and validates environment variables. Throws on startup if anything is missing. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envWithDefaults.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  return result.data;
}
