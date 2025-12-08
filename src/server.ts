import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

import * as config from './config/index.config'
import { registerErrorHandler } from './middleware/error-handler.middleware'
import * as plugins from './plugins/index.plugin'
import { registerApiRoutes } from './routes/index.route'

async function buildServer(): Promise<FastifyInstance> {
  //build the server
  const { isProduction, LOG_LEVEL } = config.env
  const app = Fastify({
    disableRequestLogging: true, // Disable default request logging
    logger: {
      level: LOG_LEVEL ?? 'info',
      stream: {
        write: chunk => {
          try {
            const obj = JSON.parse(chunk)
            if (obj.method === 'GET' && obj.url === '/' && obj.body === '[omitted]') {
              return // skip logging for health checks
            }

            const path = obj.method && obj.url ? `${obj.method} ${obj.url}` : undefined
            const reordered = {
              msg: obj.msg,
              path: path,
              params: obj.params,
              body: obj.body,
              reqId: obj.reqId,
              level: obj.level,
              time: obj.time,
              pid: obj.pid,
              hostname: obj.hostname,
            }
            process.stdout.write(`${JSON.stringify(reordered)}\n`)
          } catch {
            process.stdout.write(`${chunk}\n`) // fallback
          }
        },
      },
    },
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await plugins.registerAllPlugins(app, isProduction)
  registerErrorHandler(app)
  await registerApiRoutes(app)
  return app
}

async function start() {
  //start the server
  const portFromEnv = config.env.PORT

  await config.connectToDatabase()
  const app = await buildServer()

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    app.log.error(`Unhandled Rejection: ${JSON.stringify({ reason, promise })}`)
    process.exit(1)
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    app.log.error(`Uncaught Exception: ${JSON.stringify(error)}`)
    process.exit(1)
  })

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully`)
    try {
      await app.close()
      await config.disconnectFromDatabase()
      app.log.info('Server closed successfully')
      process.exit(0)
    } catch (err) {
      app.log.error(err, 'shutdown:error')
      process.exit(1)
    }
  }

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  try {
    await app.listen({ port: portFromEnv, host: '0.0.0.0' })
    app.log.info(`Server listening on port ${portFromEnv}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start() //start the server

export type { FastifyInstance }
