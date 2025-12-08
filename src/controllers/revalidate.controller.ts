import type { FastifyReply, FastifyRequest } from 'fastify'

import { revalidateSchoolEntitiesService } from '../services/dataproc.service'

export async function revalidateSchoolEntities(req: FastifyRequest, reply: FastifyReply) {
  await revalidateSchoolEntitiesService()
  return reply.send({ status: 'ok' })
}

