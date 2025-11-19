import type { FastifyInstance } from 'fastify'

const requestStartTime = new WeakMap<object, bigint>()

export function registerRequestLogging(app: FastifyInstance): void {
  app.addHook('onRequest', (request, _reply, done) => {
    requestStartTime.set(request, process.hrtime.bigint())
    request.log.info({ method: request.method, url: request.url, ip: request.ip }, 'request:start')
    done()
  })

  app.addHook('onResponse', (request, reply, done) => {
    const startedAt = requestStartTime.get(request)
    let durationMs: number | undefined
    if (startedAt) {
      const diffNs = Number(process.hrtime.bigint() - startedAt)
      durationMs = Math.round(diffNs / 1_000_000)
    }
    request.log.info({ statusCode: reply.statusCode, durationMs }, 'request:complete')
    done()
  })
}
