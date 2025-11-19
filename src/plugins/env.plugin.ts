import type { FastifyInstance } from 'fastify'

import { type Env, loadEnv } from '../config/env.config'

declare module 'fastify' {
  interface FastifyInstance {
    env: Env
  }
}

export async function registerEnvPlugin(app: FastifyInstance): Promise<void> {
  const env = loadEnv()

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'object') continue
    process.env[`${key}`] = String(value)
  }

  app.decorate('env', env)
}
