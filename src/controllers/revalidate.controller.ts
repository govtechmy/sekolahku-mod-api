import type { FastifyReply, FastifyRequest } from 'fastify'

import { revalidateSchoolEntitiesService } from '../services/dataproc.svc'

export async function revalidateSchoolEntities(req: FastifyRequest, reply: FastifyReply) {
  const { servicePath } = req.params as { servicePath: string }
  await revalidateSchoolEntitiesService(servicePath)
  return reply.send({ status: 'ok' })
}
