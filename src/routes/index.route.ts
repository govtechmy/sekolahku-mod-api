import type { FastifyInstance } from 'fastify'

import { payloadConnection, sekolahkuConnection } from '../config/db.config'
import { registerAcaraRoutes } from './acara.route'
import { registerAnalitikRoutes } from './analitik.route'
import { registerMapRoutes } from './map.route'
import { registerRevalidateRoute } from './revalidate.route'
import { registerSchoolRoutes } from './schools.routes'
import { registerSiaranRoutes } from './siaran.route'

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', { schema: { tags: ['System'], summary: 'Healthcheck' } }, async (_, reply) => {
    const sekolahkuDbReady = sekolahkuConnection.readyState === 1
    const payloadDbReady = payloadConnection.readyState === 1
    const isHealthy = sekolahkuDbReady && payloadDbReady

    const response = {
      status: isHealthy ? 'ok' : 'unhealthy',
      databases: {
        sekolahku: sekolahkuDbReady ? 'connected' : 'disconnected',
        payload: payloadDbReady ? 'connected' : 'disconnected',
      },
    }

    return reply.status(isHealthy ? 200 : 503).send(response)
  })

  await registerRevalidateRoute(app)
  await registerSchoolRoutes(app)
  await registerMapRoutes(app)
  await registerSiaranRoutes(app)
  await registerAcaraRoutes(app)
  await registerAnalitikRoutes(app)
}
