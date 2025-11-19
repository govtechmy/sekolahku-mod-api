import type { FastifyError, FastifyInstance } from 'fastify'

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const statusCode = (error as FastifyError).statusCode ?? 500
    request.log.error({ err: error, statusCode }, 'request:error')
    reply.status(statusCode).send({ message: error?.message ?? 'Internal Server Error' })
  })
}
