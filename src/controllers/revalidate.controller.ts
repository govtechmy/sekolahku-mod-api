import type { FastifyReply, FastifyRequest } from 'fastify'

import type { RevalidateParams } from '../schemas/revalidate/request.schema'
import { revalidateSchoolEntitiesService } from '../services/dataproc.svc'

export async function revalidateSchoolEntities(req: FastifyRequest<{ Params: RevalidateParams }>, reply: FastifyReply) {
  const { servicePath } = req.params
  await revalidateSchoolEntitiesService(servicePath)
  return reply.send({ status: 'ok' })
}
