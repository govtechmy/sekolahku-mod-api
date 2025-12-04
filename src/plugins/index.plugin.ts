import type { FastifyInstance } from 'fastify'

//import { registerDecorators } from './decorators.plugin'
import { registerEnvPlugin } from './env.plugin'
import { registerRequestLogging } from './request-logging.plugin'
import { registerSecurityPlugins } from './security.plugin'
import { registerSwaggerPlugins } from './swagger.plugin'

export async function registerAllPlugins(app: FastifyInstance, isProduction: boolean): Promise<void> {
  await registerEnvPlugin(app)
  //registerDecorators(app)
  await registerSecurityPlugins(app, isProduction)
  await registerSwaggerPlugins(app)
  registerRequestLogging(app)
}
