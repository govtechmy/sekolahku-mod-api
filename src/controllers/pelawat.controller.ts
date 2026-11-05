import type { FastifyReply, FastifyRequest } from 'fastify'
import { getVisitorCounts } from 'src/services/umami.svc'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

export async function getPelawat(req: FastifyRequest, res: FastifyReply) {
  try {
    const counts = await getVisitorCounts()
    return res.send(createSuccessResponse(counts))
  } catch (err) {
    req.log.error({ err }, 'umami:fetch-failed')
    return res.status(503).send(createErrorResponse('Visitor counts unavailable', 'ERR_503', 503))
  }
}
