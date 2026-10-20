import { z } from 'zod';

/** Optional value; an empty line in .env (e.g. "DATA_GOV_API_KEY=") counts as not set. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema.optional());
}

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().min(1, 'GEMINI_MODEL is required'),
  AI_PROVIDER: z.enum(['gemini']).default('gemini'),
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
  CORS_ORIGIN: z
    .string()
    .min(1)
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
});

export type Env = z.infer<typeof envSchema>;

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

/** Reads and validates environment variables. Throws on startup if anything is missing. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  return result.data;
}
