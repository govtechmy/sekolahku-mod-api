import { z } from 'zod'

import { SecretsManagerService } from '../services/secrets-manager.svc'
import { parseWithSchemaOrThrow } from '../utils/env-parse.util'

const EnvSchema = z.object({
  APP_ENV: z.enum(['production', 'development', 'test', 'local']).default('local'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  MONGODB_URI_PAYLOAD: z.string().min(1),
  API_KEY: z.string().min(1),
  DATAPROC_SERVICE_URL: z.string(),
  FRONTEND_ORIGIN: z
    .string()
    .optional()
    .refine(val => !val || URL.canParse(val), { message: 'Invalid URL' }),
  MULTIPLE_ORIGINS: z.string().optional(),
  DATA_URL: z.string().url(),
})

function mapSecrets(secrets: Record<string, unknown>) {
  return {
    APP_ENV: secrets.APP_ENV,
    LOG_LEVEL: secrets.LOG_LEVEL,
    PORT: secrets.PORT,
    MONGODB_URI: secrets.MONGODB_URI,
    MONGODB_URI_PAYLOAD: secrets.MONGODB_URI_PAYLOAD,
    API_KEY: secrets.API_KEY,
    DATAPROC_SERVICE_URL: secrets.DATAPROC_SERVICE_URL,
    FRONTEND_ORIGIN: secrets.FRONTEND_ORIGIN,
    MULTIPLE_ORIGINS: secrets.MULTIPLE_ORIGINS,
    DATA_URL: secrets.DATA_URL,
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
  if (isProduction && (!Array.isArray(parsed.FRONTEND_ORIGIN) || parsed.FRONTEND_ORIGIN.length === 0)) {
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
