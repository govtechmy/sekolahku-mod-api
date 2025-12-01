import { z } from 'zod'

import { SecretsManagerService } from '../services/secrets-manager.svc'
import { parseWithSchemaOrThrow } from '../utils/env-parse.util'

const EnvSchema = z.object({
  APP_ENV: z.enum(['production', 'development', 'test', 'local']).default('local'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  REFRESH_TOKEN_SECRET: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url().optional(),
  MULTIPLE_ORIGINS: z
    .string()
    .optional()
    .transform(val => {
      if (!val) return [] as string[]
      return val
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
    }),
})

function mapSecrets(secrets: Record<string, unknown>) {
  return {
    APP_ENV: secrets.APP_ENV,
    LOG_LEVEL: secrets.LOG_LEVEL,
    PORT: secrets.PORT,
    MONGODB_URI: secrets.MONGODB_URI,
    JWT_SECRET: secrets.JWT_SECRET,
    REFRESH_TOKEN_SECRET: secrets.REFRESH_TOKEN_SECRET,
    FRONTEND_ORIGIN: secrets.FRONTEND_ORIGIN,
    MULTIPLE_ORIGINS: secrets.MULTIPLE_ORIGINS,
  }
}

async function resolveEnv() {
  const secretName = process.env.AWS_SECRET_NAME

  let parsed: z.infer<typeof EnvSchema>

  if (secretName) {
    try {
      const secretsManager = new SecretsManagerService()
      const secrets = await secretsManager.getSecret(secretName)
      const mapped = mapSecrets(secrets) // map secrets to env schema
      parsed = parseWithSchemaOrThrow(EnvSchema, mapped)
    } catch (error) {
      const name = error instanceof Error ? error.name : 'UnknownError'
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`[env] Failed to load AWS Secrets (name="${secretName}"): ${name}: ${message}\n`)
      parsed = parseWithSchemaOrThrow(EnvSchema, process.env) // parse env schema from process.env
    }
  } else {
    parsed = parseWithSchemaOrThrow(EnvSchema, process.env) // parse env schema from process.env
  }

  const isProduction = parsed.APP_ENV === 'production'
  if (isProduction && (!Array.isArray(parsed.MULTIPLE_ORIGINS) || parsed.MULTIPLE_ORIGINS.length === 0)) {
    throw new Error('MULTIPLE_ORIGINS is required in production environment')
  }

  const logLevel = parsed.LOG_LEVEL ?? (isProduction ? 'info' : 'debug')

  return {
    ...parsed,
    isProduction,
    logLevel,
  }
}

export const env = await resolveEnv()

export function loadEnv(): typeof env {
  return env
}

export type Env = typeof env
