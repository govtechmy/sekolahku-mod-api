import { z } from "zod";

const EnvSchema = z.object({
  APP_ENV: z.enum(["production", "development", "test", "local"]).default("local"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  REFRESH_TOKEN_SECRET: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const flat = parsed.error.flatten();
  throw new Error(`Invalid environment configuration: ${JSON.stringify(flat)}`);
}

const data = parsed.data;
const isProduction = data.APP_ENV === "production";

if (isProduction && !data.FRONTEND_ORIGIN) {
  throw new Error("FRONTEND_ORIGIN is required in production environment");
}

const logLevel = data.LOG_LEVEL ?? (isProduction ? "info" : "debug");

export const env = {
  ...data,
  isProduction,
  logLevel,
};

export type Env = typeof env;


