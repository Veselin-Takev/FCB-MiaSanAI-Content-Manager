// Centralised, validated application configuration. Environment variables are
// parsed and type-checked once at startup so the process fails fast on invalid
// configuration instead of misbehaving at request time.

import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  GEMINI_API_KEY: z.string().optional(),
  ADMIN_API_TOKEN: z.string().optional(),
  APP_URL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(), // comma-separated allow-list
  GEMINI_COST_PER_1K: z.coerce.number().nonnegative().optional(),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  JSON_BODY_LIMIT: z.string().default("25mb"),
});

export interface AppConfig {
  nodeEnv: "development" | "production" | "test";
  isProd: boolean;
  port: number;
  corsOrigins: string[];
  requestTimeoutMs: number;
  jsonBodyLimit: string;
  hasGeminiKey: boolean;
  hasAdminToken: boolean;
  warnings: string[];
}

/**
 * Validates the environment and returns a typed config object. Throws on
 * structurally invalid values (e.g. a non-numeric PORT). Soft misconfigurations
 * (missing keys in production) are surfaced as `warnings` rather than throwing,
 * so the app stays bootable in demo/preview environments.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      "Invalid environment configuration: " +
        JSON.stringify(parsed.error.flatten().fieldErrors)
    );
  }
  const e = parsed.data;
  const isProd = e.NODE_ENV === "production";
  const warnings: string[] = [];
  if (isProd && !e.ADMIN_API_TOKEN) {
    warnings.push("ADMIN_API_TOKEN is not set – admin endpoints are disabled (fail-closed).");
  }
  if (isProd && !e.GEMINI_API_KEY) {
    warnings.push("GEMINI_API_KEY is not set – AI features run in simulated mode.");
  }
  return {
    nodeEnv: e.NODE_ENV,
    isProd,
    port: e.PORT,
    corsOrigins: (e.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
    requestTimeoutMs: e.REQUEST_TIMEOUT_MS,
    jsonBodyLimit: e.JSON_BODY_LIMIT,
    hasGeminiKey: !!e.GEMINI_API_KEY,
    hasAdminToken: !!e.ADMIN_API_TOKEN,
    warnings,
  };
}
