import compress from '@fastify/compress'
import etag from '@fastify/etag'
import type { FastifyInstance } from 'fastify'

import { registerCentroidPlugin } from './centroid.plugin'
import { registerEnvPlugin } from './env.plugin'
import { registerRequestLogging } from './request-logging.plugin'
import { registerSecurityPlugins } from './security.plugin'
import { registerSwaggerPlugins } from './swagger.plugin'

export async function registerAllPlugins(app: FastifyInstance, isProduction: boolean): Promise<void> {
  await registerEnvPlugin(app)
  await registerCentroidPlugin(app)
  await registerSecurityPlugins(app, isProduction)
  await registerSwaggerPlugins(app)
  await app.register(compress, { global: true })
  await app.register(etag)
  registerRequestLogging(app)
}
