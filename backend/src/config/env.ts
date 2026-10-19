import { z } from 'zod';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().min(1, 'GEMINI_MODEL is required'),
  AI_PROVIDER: z.enum(['gemini']).default('gemini'),
  PORT: z.coerce.number().int().positive().default(4000),
  /** Number of reverse proxies in front of the app (1 behind nginx in Docker), so rate limits see real client IPs. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Optional. Without it the app works, but diagnosis history is turned off. */
  MONGO_URI: z.string().trim().min(1).optional(),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
});

export type Env = z.infer<typeof envSchema>;

/** Reads and validates environment variables. Throws on startup if anything is missing. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  return result.data;
}
