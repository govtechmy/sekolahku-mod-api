import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import type { FastifyInstance } from 'fastify'

import { env } from '../config/env.config'

export async function registerSecurityPlugins(app: FastifyInstance, isProduction: boolean) {
  if (isProduction) {
    await app.register(fastifyCors, { origin: env.MULTIPLE_ORIGINS, methods: '*' })
  } else {
    await app.register(fastifyCors, { origin: true, methods: '*' })
  }
  await app.register(fastifyHelmet, { contentSecurityPolicy: false })
}
